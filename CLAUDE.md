# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuizHub Pro is a full-stack online assessment platform built with TanStack Start (React 19), Supabase, and deployed on Cloudflare Edge. The application supports two user roles: teachers (who create and manage exams) and students (who take exams).

## Tech Stack

- **Frontend Framework**: TanStack Start (full-stack React framework with file-based routing)
- **React**: v19 with new compiler features
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: Tailwind CSS v4 with OKLCH color space
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **Deployment**: Cloudflare Edge (global CDN)

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Build for development (with source maps)
npm run build:dev

# Preview production build
npm run preview

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture

### Routing
- File-based routing via TanStack Router in `src/routes/`
- Route files follow pattern: `route-name.tsx` for pages, `route-name.nested.tsx` for nested routes
- Root layout: `__root.tsx`
- Protected routes use `AuthGuard` component

### Key Route Patterns
- `/` - Landing page
- `/login`, `/register` - Authentication
- `/dashboard/*` - Teacher dashboard (protected)
  - `/dashboard/subjects` - Subject management
  - `/dashboard/exams` - Exam management
  - `/dashboard/results` - View exam results
  - `/dashboard/import` - Import questions from DOCX
- `/lobby/$examCode` - Exam lobby (students enter name, start exam)
- `/exam/$attemptId` - Active exam session with timer
- `/practice/$examCode` - Practice mode (no timer, instant feedback)
- `/result/$attemptId` - Exam results page

### Authentication & Authorization
- Auth context in `src/lib/auth.tsx` provides `useAuth()` hook
- Two roles: `teacher` and `student`
- Supabase handles auth with JWT tokens stored in localStorage
- Profile data fetched from `profiles` table includes `role` and `full_name`
- Anonymous students can take exams using `anon_secret` for session persistence

### Database Architecture
Key tables:
- `profiles` - User profiles with role (teacher/student)
- `subjects` - Teacher-created subjects
- `exams` - Exams with code, duration, published status
- `questions` - Question bank with content, options, correct_answer, explanation
- `exam_questions` - Junction table linking exams to questions with order_index
- `exam_attempts` - Student exam sessions with answers, score, timing

### Services Layer
Located in `src/services/`:
- `exam.service.ts` - Exam and question fetching
- `subject.service.ts` - Subject CRUD operations

All database operations use Supabase client with type-safe queries.

### State Management
- TanStack Query for all server state (queries, mutations)
- Query keys follow pattern: `['resource', id]` or `['resource-action', params]`
- Default stale time: 30 seconds
- Window focus refetch disabled globally

### UI Components
- Reusable components in `src/components/ui/` (shadcn/ui pattern)
- Feature components in `src/components/dashboard/`, `src/components/landing/`, etc.
- Use `cn()` utility from `src/lib/utils.ts` for className merging

### Exam Engine
- `useQuizEngine` hook (`src/hooks/useQuizEngine.ts`) manages quiz state
- Supports staged answers (select then confirm pattern)
- Plays audio feedback on correct answers
- Tracks progress and completion

### Security Features
- **RPC-Only Architecture**: All exam mutations go through Supabase RPC functions (not direct table access)
- **Row Level Security**: Supabase RLS policies enforce data access rules
- **Cheating Detection**: Timer enforcement, answer persistence, session validation
- **HTML Sanitization**: All user-generated content sanitized with DOMPurify via `sanitizeHtml()` utility

### Import Feature
- `ImportDocxView` component parses DOCX files using `mammoth` library
- Extracts questions, options, correct answers from Word documents
- Uses JSZip to parse document.xml for answer key detection
- Generates unique 6-character exam codes

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

## Code Style Guidelines

This project follows Karpathy Guidelines (see `.cursor/skills/karpathy-guidelines/`):
- Minimum code that solves the request
- Local, surgical diffs over broad refactors
- Explicit assumptions over silent choices
- No features beyond what was asked
- No abstractions for single-use code
- Match existing style

## Testing

- Test framework: Vitest
- Testing library: @testing-library/react
- Test files: `*.test.ts` or `*.test.tsx`
- Setup: `src/test/setup.ts`

## Type Safety

- Strict TypeScript enabled
- Database types auto-generated in `src/integrations/supabase/types.ts`
- Use `Tables<"table_name">` for row types
- Use `TablesInsert<"table_name">` for insert payloads
- Use `TablesUpdate<"table_name">` for update payloads

## AI Development Context

This project was developed with assistance from:
- Claude Code (Anthropic) - Development orchestration and code generation
- 9router API - Multi-model AI routing (Claude Opus 4.7, Gemini 3.1 Pro, DeepSeek V4)
- Karpathy Guidelines - Code quality and simplicity principles

## Supabase MCP Integration

Claude Code is configured with Supabase MCP server for direct database operations. Available tools include:
- `execute_sql` - Run SQL queries
- `list_tables` - View database schema
- `generate_typescript_types` - Regenerate type definitions
- `list_auth_users`, `create_auth_user`, etc. - User management

When making schema changes, regenerate types with the MCP tool and update `src/integrations/supabase/types.ts`.
