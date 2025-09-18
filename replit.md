# Overview

A modern React single-page application built with Vite, featuring Firebase authentication, React Router for navigation, and Tailwind CSS for styling. The project implements a trading/investment platform concept called "Alpha League" with pages for ideas, traders, and user settings. The application includes a complete authentication system with anonymous and Google sign-in options, error boundaries for robust error handling, and a responsive dark-themed UI.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 19**: Modern React with latest features and performance improvements
- **Vite**: Fast build tool and development server with Hot Module Replacement (HMR)
- **Single Page Application (SPA)**: Client-side routing with React Router DOM v6
- **Component Structure**: Organized into layouts, pages, components, and contexts directories
- **Error Handling**: Global ErrorBoundary component for graceful error recovery

## Styling and UI
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Dark Theme**: Consistent slate color palette throughout the application
- **Responsive Design**: Mobile-first approach with responsive navigation and layouts
- **PostCSS**: CSS processing with Autoprefixer for cross-browser compatibility

## Authentication System
- **Firebase Auth**: Handles user authentication and session management
- **Multiple Sign-in Methods**: Anonymous authentication and Google OAuth
- **React Context**: AuthContext provides authentication state throughout the app
- **Environment Configuration**: Firebase config managed through Vite environment variables

## Routing Architecture
- **React Router v6**: Declarative routing with nested routes
- **Layout System**: RootLayout component provides consistent navigation and footer
- **Active Link Styling**: Visual indicators for current page navigation
- **Page Components**: Separate components for Home, Ideas, Traders, and Settings pages

## Development Environment
- **ESLint**: Code linting with React-specific rules and hooks validation
- **Hot Reload**: Development server with HMR for fast iteration
- **Replit Optimization**: Custom Vite configuration for Replit hosting environment

# External Dependencies

## Authentication & Backend
- **Firebase**: Complete authentication service with multiple provider support
- **Firebase Auth Domain**: Requires configuration of authorized domains for OAuth

## Development Tools
- **Vite**: Build tool and development server
- **ESLint**: Code quality and consistency enforcement
- **PostCSS & Autoprefixer**: CSS processing pipeline

## UI Framework
- **Tailwind CSS**: Utility-first CSS framework
- **React Router DOM**: Client-side routing solution

## Environment Configuration
- Requires Firebase configuration through Replit Secrets:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN` 
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_APP_ID`
  - Additional optional Firebase services (Storage, Messaging, Analytics)