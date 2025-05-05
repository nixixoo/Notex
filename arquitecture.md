```mermaid
graph LR
  subgraph Frontend [Angular 18.2.6]
    direction TB
    FE[AngularApp]:::component
    FE --> AS[AuthService]:::component
    FE --> NS[NotesService]:::component
    FE --> GS[GroupsService]:::component
    FE --> CS[ChatService]:::component
  end

  subgraph Backend [Node.js]
    direction TB
    subgraph Controllers
      AC[AuthController]:::component
      NC[NotesController]:::component
      GC[GroupsController]:::component
      ChC[ChatController]:::component
    end
    subgraph Models
      UC[User]:::component
      NM[Note]:::component
      GM[Group]:::component
      CM[ChatMessage]:::component
    end
  end

  subgraph Database
    DB[(Turso / libSQL)]
  end

  subgraph External APIs
    Gemini["Google Gemini API"]
  end

  %% Relaciones Front → Back
  AS --> AC
  NS --> NC
  GS --> GC
  CS --> ChC

  %% Controllers → Models → DB/API
  AC --> UC --> DB
  NC --> NM --> DB
  GC --> GM --> DB
  ChC --> CM --> DB
  CM --> Gemini

  classDef component fill:#db2e3c,stroke:#333,stroke-width:1px;