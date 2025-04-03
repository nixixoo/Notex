import { Injectable, Inject } from "@angular/core";
import { BehaviorSubject, Observable, from, of } from "rxjs";
import { map, catchError, tap } from "rxjs/operators";
import { createClient, type ResultSet, type Row } from "@libsql/client";
import { Group, CreateGroupRequest, UpdateGroupRequest } from "../models/group.model";
import { AuthService } from "./auth.service";
import { Note } from "../models/note.model";

@Injectable({
  providedIn: "root",
})
export class GroupsService {
  private readonly LOCAL_STORAGE_KEY = "guest_groups";
  private readonly GUEST_USER_ID = "guest";
  private client = createClient({
    url: "libsql://notex-nixixo.turso.io",
    authToken:
      "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDEyMzAzNDMsImlkIjoiZGE3MjczNmUtMGY3OC00YzVkLTlkMTYtZGQ4ZTg4OWM2ZWZjIn0.WG8YgocNf2Vbugg_6jVZi09dXnGqjqJ1NFrmAkmEpMCT-DdgM2V2rr_IlvBLc2YpOhChu2FrXUrjXizFdpw7Bg",
  });

  private groupsSubject = new BehaviorSubject<Group[]>([]);
  public groups$ = this.groupsSubject.asObservable();

  constructor(@Inject(AuthService) private authService: AuthService) {
    this.initDatabase();
  }

  /**
   * Initializes the groups database.
   *
   * Creates the groups table with the following columns:
   * - id (TEXT PRIMARY KEY)
   * - name (TEXT NOT NULL)
   * - description (TEXT)
   * - createdAt (DATETIME DEFAULT CURRENT_TIMESTAMP)
   * - updatedAt (DATETIME DEFAULT CURRENT_TIMESTAMP)
   * - userId (TEXT NOT NULL, FOREIGN KEY references users(id) ON DELETE CASCADE)
   * - color (TEXT)
   *
   * Also adds the groupId column to the notes table if it doesn't exist.
   */
  private async initDatabase() {
    try {
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          userId TEXT NOT NULL,
          color TEXT,
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Add groupId column to notes table if it doesn't exist
      await this.client.execute(`
        PRAGMA table_info(notes)
      `).then(async (result) => {
        const columns = result.rows.map(row => row['name']);
        if (!columns.includes('groupId')) {
          await this.client.execute(`
            ALTER TABLE notes ADD COLUMN groupId TEXT
          `);
        }
      });
      
      // Add color column to groups table if it doesn't exist
      await this.client.execute(`
        PRAGMA table_info(groups)
      `).then(async (result) => {
        const columns = result.rows.map(row => row['name']);
        if (!columns.includes('color')) {
          await this.client.execute(`
            ALTER TABLE groups ADD COLUMN color TEXT
          `);
        }
      });
      
    } catch (error) {
      console.error("Error initializing groups database:", error);
    }
  }

  getLocalGroups(): Group[] {
    const groups = localStorage.getItem(this.LOCAL_STORAGE_KEY);
    return groups ? JSON.parse(groups) : [];
  }

  private saveLocalGroups(groups: Group[]): void {
    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(groups));
  }

  getGroups(): Observable<Group[]> {
    if (this.authService.isGuestMode()) {
      const groups = this.getLocalGroups();
      return of(groups);
    }

    if (this.authService.isAuthenticated()) {
      const userId = this.authService.getCurrentUser()?.id;
      if (!userId) return of([]);

      return from(
        this.client.execute({
          sql: "SELECT * FROM groups WHERE userId = ? ORDER BY updatedAt DESC",
          args: [userId],
        }),
      ).pipe(
        map((result) => this.mapGroups(result)),
        catchError((error) => {
          console.error("Error fetching groups:", error);
          throw error;
        }),
      );
    } else {
      const groups = this.getLocalGroups()
        .map((group) => ({
          ...group,
          createdAt: new Date(group.createdAt),
          updatedAt: new Date(group.updatedAt),
          isLocal: true,
        }));
      return of(groups);
    }
  }

  getGroupById(id: string): Observable<Group> {
    if (this.authService.isGuestMode()) {
      const groups = this.getLocalGroups();
      const localGroup = groups.find((g) => g.id === id);
      if (localGroup) {
        return of({
          ...localGroup,
          createdAt: new Date(localGroup.createdAt),
          updatedAt: new Date(localGroup.updatedAt),
          isLocal: true,
        });
      }
      throw new Error("Group not found");
    }

    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) throw new Error("Not authenticated");

    return from(
      this.client.execute({
        sql: "SELECT * FROM groups WHERE id = ? AND userId = ?",
        args: [id, userId],
      }),
    ).pipe(
      map((result) => {
        if (result.rows.length === 0) throw new Error("Group not found");
        return this.mapGroup(result.rows[0]);
      }),
      catchError((error) => {
        console.error("Error fetching group:", error);
        throw error;
      }),
    );
  }

  createGroup(groupData: CreateGroupRequest): Observable<Group> {
    // Guest Mode Flow
    if (this.authService.isGuestMode()) {
      const id = Date.now().toString();
      const newGroup: Group = {
        id,
        name: groupData.name,
        description: groupData.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: this.GUEST_USER_ID,
        isLocal: true,
        color: groupData.color || '',
      };

      // Update local storage
      const groups = this.getLocalGroups();
      groups.unshift(newGroup);
      this.saveLocalGroups(groups);

      // Update BehaviorSubject for immediate UI update
      this.groupsSubject.next([newGroup, ...this.groupsSubject.value]);

      return of(newGroup);
    }

    // Authenticated User Flow
    if (this.authService.isAuthenticated()) {
      const currentUser = this.authService.getCurrentUser();

      if (!currentUser?.id) {
        console.error("[GroupsService] No user ID found for authenticated user");
        throw new Error("User not authenticated");
      }

      const id = Date.now().toString();
      const now = new Date().toISOString();
      const newGroup: Group = {
        id,
        name: groupData.name,
        description: groupData.description,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        userId: currentUser.id,
        color: groupData.color || '',
      };

      return from(
        this.client.execute({
          sql: "INSERT INTO groups (id, name, description, createdAt, updatedAt, userId, color) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [id, groupData.name, groupData.description, now, now, currentUser.id, groupData.color || null],
        }),
      ).pipe(
        map(() => {
          const currentGroups = this.groupsSubject.value;
          this.groupsSubject.next([newGroup, ...currentGroups]);
          return newGroup;
        }),
        catchError((error) => {
          console.error("Error creating group:", error);
          throw error;
        }),
      );
    }

    // Error if neither authenticated nor in guest mode
    console.error("[GroupsService] No valid authentication method");
    throw new Error("Please login or continue as guest");
  }

  updateGroup(id: string, groupData: UpdateGroupRequest): Observable<Group> {
    if (this.authService.isGuestMode()) {
      const groups = this.getLocalGroups();
      const groupIndex = groups.findIndex((g) => g.id === id);

      if (groupIndex === -1) {
        return of().pipe(
          catchError(() => {
            throw new Error("Group not found");
          }),
        );
      }

      const updatedGroup: Group = {
        ...groups[groupIndex],
        ...groupData,
        updatedAt: new Date(),
      };

      groups[groupIndex] = updatedGroup;
      this.saveLocalGroups(groups);

      // Update BehaviorSubject
      const currentGroups = this.groupsSubject.value;
      const updatedGroups = currentGroups.map((group) => (group.id === id ? updatedGroup : group));
      this.groupsSubject.next(updatedGroups);

      return of(updatedGroup);
    }

    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) throw new Error("Not authenticated");
    const updatedAt = new Date();

    // Build the SQL query dynamically based on what fields are provided
    let sql = `UPDATE groups SET updatedAt = ?`;
    const args: any[] = [updatedAt.toISOString()];

    if (groupData.name !== undefined) {
      sql += `, name = ?`;
      args.push(groupData.name);
    }

    if (groupData.description !== undefined) {
      sql += `, description = ?`;
      args.push(groupData.description);
    }
    
    if (groupData.color !== undefined) {
      sql += `, color = ?`;
      args.push(groupData.color);
    }

    sql += ` WHERE id = ? AND userId = ? RETURNING *`;
    args.push(id, userId);

    return from(
      this.client.execute({
        sql,
        args,
      }),
    ).pipe(
      map((result) => {
        if (result.rows.length === 0) {
          throw new Error("Group not found");
        }

        const updatedGroup = this.mapGroup(result.rows[0]);
        const currentGroups = this.groupsSubject.value;
        const updatedGroups = currentGroups.map((group) => 
          group.id === id ? updatedGroup : group
        );
        this.groupsSubject.next(updatedGroups);
        return updatedGroup;
      }),
      catchError((error) => {
        console.error("Error updating group:", error);
        throw error;
      }),
    );
  }

  deleteLocalGroup(groupId: string): void {
    const groups = this.getLocalGroups();
    const filteredGroups = groups.filter((g) => g.id !== groupId);
    this.saveLocalGroups(filteredGroups);
    this.groupsSubject.next([...filteredGroups, ...this.groupsSubject.value.filter((g) => !g.isLocal)]);
  }

  deleteGroup(id: string): Observable<void> {
    if (this.authService.isGuestMode()) {
      this.deleteLocalGroup(id);
      return of(void 0);
    }

    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) throw new Error("Not authenticated");

    return from(
      this.client.execute({
        sql: "DELETE FROM groups WHERE id = ? AND userId = ?",
        args: [id, userId],
      }),
    ).pipe(
      map(() => {
        const currentGroups = this.groupsSubject.value;
        const updatedGroups = currentGroups.filter((group) => group.id !== id);
        this.groupsSubject.next(updatedGroups);
      }),
      catchError((error) => {
        console.error("Error deleting group:", error);
        throw error;
      }),
    );
  }

  getNotesInGroup(groupId: string): Observable<Note[]> {
    if (this.authService.isGuestMode()) {
      const notes = localStorage.getItem('guest_notes');
      const groupNotes = notes ? JSON.parse(notes).filter((note: Note) => note.groupId === groupId) : [];
      return of(groupNotes);
    }

    if (this.authService.isAuthenticated()) {
      const userId = this.authService.getCurrentUser()?.id;
      if (!userId) return of([]);

      return from(
        this.client.execute({
          sql: "SELECT * FROM notes WHERE userId = ? AND groupId = ? AND status = 'active' ORDER BY updatedAt DESC",
          args: [userId, groupId],
        }),
      ).pipe(
        map((result) => this.mapNotes(result)),
        catchError((error) => {
          console.error("Error fetching notes in group:", error);
          throw error;
        }),
      );
    }

    return of([]);
  }

  getGroupCount(): Observable<number> {
    if (this.authService.isGuestMode()) {
      const groups = this.getLocalGroups();
      return of(groups.length);
    }

    if (this.authService.isAuthenticated()) {
      const userId = this.authService.getCurrentUser()?.id;
      if (!userId) return of(0);

      return from(
        this.client.execute({
          sql: "SELECT COUNT(*) as count FROM groups WHERE userId = ?",
          args: [userId],
        }),
      ).pipe(
        map((result) => Number(result.rows[0]['count'])),
        catchError((error) => {
          console.error("Error getting group count:", error);
          return of(0);
        }),
      );
    }

    return of(0);
  }

  private mapGroups(result: ResultSet): Group[] {
    return result.rows.map((row) => this.mapGroup(row));
  }

  private mapGroup(row: Row): Group {
    return {
      id: row["id"] as string,
      name: row["name"] as string,
      description: row["description"] as string,
      createdAt: new Date(row["createdAt"] as string),
      updatedAt: new Date(row["updatedAt"] as string),
      userId: row["userId"] as string,
      color: row["color"] as string || '',
    };
  }

  private mapNotes(result: ResultSet): Note[] {
    return result.rows.map((row) => ({
      id: row["id"] as string,
      title: row["title"] as string,
      subtitle: row["subtitle"] as string,
      content: row["content"] as string,
      createdAt: new Date(row["createdAt"] as string),
      updatedAt: new Date(row["updatedAt"] as string),
      userId: row["userId"] as string,
      status: ((row["status"] as string) || "active") as "active" | "archived" | "trashed",
      groupId: (row["groupId"] as string) || undefined,
      color: row["color"] as string || ''
    }));
  }
}
