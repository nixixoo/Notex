import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      type?: 'warning' | 'confirm';
    },
    public dialogRef: MatDialogRef<ConfirmDialogComponent>
  ) {
    // Set dialog container background to match theme
    dialogRef.addPanelClass('app-dialog');
  }

  truncateNoteTitle(message: string): string {
    return message.replace(/"([^"]+)"/, (_, title) => 
      '"' + (title.length > 30 ? title.slice(0, 30) + '...' : title) + '"'
    );
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
