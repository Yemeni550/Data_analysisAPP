Design Approach
Selected Approach: Design System (Material Design + Linear-inspired)

Justification: This is a utility-focused, information-dense enterprise application where efficiency, data clarity, and consistent patterns are paramount. Drawing from Material Design's robust component library and Linear's clean, modern dashboard aesthetics ensures optimal usability for complex warehouse operations.

Key Design Principles:

Clarity over decoration: Every element serves a functional purpose
Scannable information hierarchy for quick decision-making
Consistent patterns reduce cognitive load across 20+ pages
Data-first presentation with clear visual hierarchy
Typography
Font Family:

Primary: Inter (via Google Fonts CDN)
Monospace: JetBrains Mono (for SKUs, batch numbers, technical data)
Type Scale:

Page Headers: text-3xl font-semibold (30px)
Section Headers: text-xl font-semibold (20px)
Card/Panel Titles: text-lg font-medium (18px)
Body Text: text-base (16px)
Table Headers: text-sm font-medium uppercase tracking-wide (14px)
Table Data/Labels: text-sm (14px)
Captions/Metadata: text-xs (12px)
Layout System
Spacing Units: Tailwind units of 2, 4, 6, 8, 12, 16

Tight spacing: p-2, gap-2 (within components)
Standard spacing: p-4, gap-4 (between related elements)
Section spacing: p-6, p-8 (panel padding, card interiors)
Page margins: p-8, p-12 (main content areas)
Grid Structure:

Dashboard: Sidebar (w-64 fixed) + Main content area (flex-1)
Content max-width: max-w-7xl for main containers
Table/data views: Full-width within content area
Form layouts: max-w-2xl for focused input experiences
Component Library
Navigation
Sidebar Navigation:

Fixed left sidebar (w-64, h-screen)
Logo at top (p-6)
Navigation items with icons (from Heroicons) + labels
Active state: subtle background treatment
Collapsible sections for sub-navigation
User profile/logout at bottom
Top Bar:

Breadcrumb navigation (left)
Search bar (center, w-96)
Notifications + user avatar (right)
Height: h-16, border-b separator
Dashboard Components
Stat Cards (Grid):

4-column grid on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
Each card: p-6, rounded-lg border
Large number: text-3xl font-bold
Label: text-sm
Trend indicator: small badge with arrow icon
Gap: gap-6
Charts/Analytics:

Container: p-6, rounded-lg border
Title + action buttons in header
Chart area with adequate padding
Legend below or to side
Data Tables:

Zebra striping for row alternation
Sticky header (sticky top-0)
Row height: h-12
Cell padding: px-4 py-3
Sortable columns with icon indicators
Actions column (right-aligned): icon buttons
Checkbox column (left): for batch operations
Hover state on rows
Forms & Inputs
Form Layouts:

Two-column grid for related fields (grid-cols-2 gap-4)
Full-width for text areas and complex inputs
Label above input (text-sm font-medium mb-2)
Input height: h-10 for text inputs
Input padding: px-3
Rounded corners: rounded-md
Border treatment with focus states
Form Sections:

Group related fields in panels (p-6, border, rounded-lg)
Section headers with divider line
Spacing between sections: space-y-6
Excel-like Table Manager
Table Interface:

Toolbar above table (h-12, border-b)
Column headers: draggable, resizable indicators
Cell editing: inline with focus state
Context menu for right-click operations
Column type indicators (icon badges)
Validation error highlighting inline
AI Image Processing Panel
Split View Layout:

Left: Image preview area (aspect-video or aspect-square)
Right: Extracted data panel
60/40 split on desktop
Stack vertically on mobile
Live preview with processing indicator overlay
Processing States:

Upload zone: Dashed border, centered icon + text
Processing: Spinner + progress indicator
Complete: Extracted fields in structured list
Each field: Label + extracted value + edit icon
Modals & Overlays
Modal Structure:

Backdrop: Semi-transparent overlay
Modal: max-w-2xl, centered, rounded-lg
Header: p-6, border-b (title + close button)
Body: p-6
Footer: p-6, border-t (action buttons, right-aligned)
Confirmation Dialogs:

max-w-md, centered
Icon at top (warning/info/success)
Message text
Two-button layout (Cancel + Confirm)
Cards & Panels
Standard Card:

Border, rounded-lg
Padding: p-6
Header with title + optional action
Content area with natural spacing
Footer (if needed): border-t, pt-4
Warehouse/Inventory Cards:

Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
Image at top (aspect-video or aspect-square)
Title + metadata below
Status badges
Action buttons at bottom
Buttons & Actions
Primary Actions:

Height: h-10
Padding: px-4
Rounded: rounded-md
Font: text-sm font-medium
Icon Buttons:

Size: w-10 h-10
Rounded: rounded-md
Icon from Heroicons (20px)
Button Groups:

Inline-flex gap-2
Border separator between related actions
Status & Alerts
Alert Banners:

Full-width within container
p-4, rounded-lg
Icon (left) + message + close button (right)
Variants: Info, Success, Warning, Error
Badges:

Inline-flex items-center
px-2.5 py-0.5
Rounded-full
text-xs font-medium
Notification Panel:

Dropdown from top bar
w-96, max-h-96, overflow-y-auto
Each notification: p-4, border-b
Timestamp in text-xs
Page-Specific Layouts
Login Page:

Centered card (max-w-md)
Logo at top
Form fields with generous spacing
Footer links below form
Dashboard:

Grid of stat cards at top
Charts in 2-column grid below
Recent activity table/feed at bottom
Inventory Management:

Filter toolbar at top
Data table with inline actions
Bulk action bar (sticky bottom when items selected)
Table Manager:

Full-screen interface
Toolbar with formatting options
Main table area (spreadsheet-like)
Properties panel (right sidebar, toggleable)
Warehouse Detail View:

Header with warehouse info + actions
Tabs for different views (Inventory, Analytics, Settings)
Tab content area below
Responsive Behavior
Breakpoints:

Mobile: base (< 768px) - Stack layouts, collapse sidebar to drawer
Tablet: md (768px) - 2-column grids, persistent sidebar
Desktop: lg (1024px+) - Full multi-column layouts
Mobile Adaptations:

Sidebar becomes slide-out drawer
Tables scroll horizontally or card view
Multi-column grids become single column
Reduce padding: p-4 instead of p-6/p-8
Icons
Use Heroicons (outline style) via CDN for all interface icons. Consistent 20px size for inline icons, 24px for feature icons.

Images
This application is data-focused and does not require decorative hero images. Any images used are functional:

Product photos in inventory cards (aspect-square, object-cover)
Warehouse location images (aspect-video)
Uploaded images in AI processing panel
User avatars (rounded-full)
All images should have proper alt text and loading states (skeleton placeholders)