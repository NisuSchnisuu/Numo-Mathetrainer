# GEMINI.md

## Project Overview
**Project Name:** Numo-MatheTrainer
**Description:** A modular math training platform ("MatheTrainer") designed as a hybrid system. It consists of a central **Dashboard Shell** that manages navigation and categories, and **Standalone Apps** (games and exercises) that run independently.
**Primary Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4.

## Architecture
The project follows a "Shell & Apps" architecture:

1.  **Dashboard Shell (`/src`):**
    -   Built with React + Vite.
    -   Handles routing (simple link-based), category management ("Spiele", "Üben", "Theorie"), and the main UI layout.
    -   Acts as a launcher for the individual apps.

2.  **Standalone Apps (`/public/apps`):**
    -   Located in `public/apps/<Category>/<AppName>/`.
    -   Served as static files (`index.html`).
    -   **Important:** Must be completely self-contained (no dependency on root `node_modules` at runtime).
    -   Can be built with any technology (Vanilla JS, React, Vue, etc.), as long as the output is static.

3.  **App Registry:**
    -   Apps are registered in `src/data/apps.ts`.
    -   This registry controls what is displayed on the dashboard.

## Development Guidelines

### 1. Adding a New App
-   **Location:** Create a new folder in `public/apps/<Category>/<AppName>`.
-   **Implementation:** Build your app. If using a framework, build it into this directory. Ensure `index.html` is the entry point.
-   **Assets:** Place app-specific assets within the app's folder.
-   **Thumbnail:** Add a thumbnail image to `public/app-thumbnails/`.
-   **Registration:** Add a new entry to the `apps` array in `src/data/apps.ts` with the correct path and metadata.

### 2. Styling
-   **Framework:** Tailwind CSS v4 is used for the Dashboard Shell.
-   **Theme:** Dark mode by default (Slate-950 background).
-   **Icons:** `lucide-react` is used in the Shell.

### 3. File Structure
-   `src/`: Dashboard source code.
-   `public/apps/`: Container for all sub-applications.
-   `src/data/apps.ts`: Central registry for apps.
-   `NUMO_FRAMEWORK.md`: Detailed architectural documentation.

## AI Collaboration Rules
-   **Context Awareness:** Always check `NUMO_FRAMEWORK.md` and `src/data/apps.ts` when discussing app integration.
-   **Path Handling:** Be mindful of relative paths when linking apps from the dashboard.
-   **Preserve Structure:** Do not move the `public/apps` structure unless explicitly refactoring the core architecture.
