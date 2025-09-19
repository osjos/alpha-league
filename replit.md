# Overview

A modern React single-page application built with Vite featuring a trading platform called "Alpha League". The application allows users to find, submit, and track alpha-generating trading ideas. Built with React Router for navigation and Tailwind CSS for styling, the platform includes a landing page, idea feed, submission form, and leaderboard functionality.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 19**: Modern React with latest features and performance improvements
- **Vite**: Fast build tool and development server with Hot Module Replacement (HMR)
- **Single Page Application (SPA)**: Client-side routing with React Router DOM v6
- **Component Structure**: All components defined within App.jsx for simplicity

## Styling and UI
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Light Theme**: Clean white background with gray accents
- **Responsive Design**: Mobile-first approach with responsive grids and layouts
- **PostCSS**: CSS processing with Autoprefixer for cross-browser compatibility

## Application Pages
- **Landing**: Homepage with platform overview and top 5 leaderboard preview
- **Feed**: Browse approved trading ideas with filter options (asset, direction, timeframe)
- **Submit Idea**: Form wizard for submitting new trading ideas
- **Leaderboard**: Sortable table showing trader statistics (WR, PF, 30d PnL, MDD)

## Routing Architecture
- **React Router v6**: Simple routing with top-level navigation
- **Navigation Bar**: Persistent header with Alpha League branding and main navigation links
- **Direct Routes**: Each page component renders directly without nested layouts

## Development Environment
- **ESLint**: Code linting with React-specific rules and hooks validation
- **Hot Reload**: Development server with HMR for fast iteration
- **Replit Optimization**: Custom Vite configuration for Replit hosting environment

# External Dependencies

## Core Framework
- **React**: Component library for building user interfaces
- **React Router DOM**: Client-side routing solution

## Development Tools
- **Vite**: Build tool and development server
- **ESLint**: Code quality and consistency enforcement
- **PostCSS & Autoprefixer**: CSS processing pipeline

## UI Framework
- **Tailwind CSS**: Utility-first CSS framework for styling

# Project Structure

## Main Application
- `src/App.jsx`: Main application component with routing and all page components
- `src/main.jsx`: Application entry point
- `src/index.css`: Tailwind CSS imports and base styles

## Trading Platform Features
- Landing page with platform introduction and leaderboard preview
- Feed page for browsing trading ideas with filtering capabilities
- Submit page for new idea submission form wizard
- Leaderboard page with trader performance metrics
- Responsive navigation with clean, professional design