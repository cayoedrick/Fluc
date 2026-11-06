# Implementation Plan - Unified Categories & Official Reference Icons

## User Requirements
1. Unify categories into a single flat list (remove the separation between recipe and expense categories).
2. Set the 26 official categories from the attached reference image with their corresponding vector line-art icons.
3. Sort categories alphabetically by default while allowing custom user reordering (up/down).
4. Render the corresponding category icons across all screens including Categories View, Extrato View, Dashboard View, LancamentoModal, and EditLancamentoModal.

## Proposed Changes

### 1. Data & Types (`src/types.ts` & `src/data/defaults.ts`)
- Update `Categoria` interface to make `tipo` optional (or 'geral') and ensure `icone` property is present.
- Define the 26 official categories sorted alphabetically in `DEFAULT_CATEGORIES` with their respective icon identifiers.

### 2. Category Management (`src/components/CategoriasView.tsx`)
- Remove recipe/expense tabs (`activeTab`), displaying a single unified list of all categories.
- Provide default alphabetical sorting upon first load, while keeping up/down manual reordering buttons functional.
- Render the custom `CategoryIcon` for each category item.

### 3. Transaction Modals (`src/components/LancamentoModal.tsx` & `src/components/EditLancamentoModal.tsx`)
- Update category selection dropdown/grid to display all unified categories along with their respective `CategoryIcon`.

### 4. Transaction Views (`src/components/ExtratoView.tsx` & `src/components/DashboardView.tsx`)
- Update transaction item rendering to display the category's official `CategoryIcon` instead of generic transaction type icons.

## Verification Plan
- Run `compile_applet` and `lint_applet` to verify compilation and TypeScript types.
- Verify category management and icon rendering across all views.
