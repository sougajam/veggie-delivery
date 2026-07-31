The journey of building and publishing Veggie Delivery transformed a local, split-port application into a robust, cloud-native full-stack system. This project utilizes Node.js, Express, and Google Sheets for the backend, paired with vanilla JavaScript frontends deployed across Netlify and Render. Here is the complete chronicle of the development and publishing process.

Phase 1: Local Conception and Architecture Design
Development began with a clear vision: a lightweight e-commerce platform where fresh produce data, customer profiles, and orders are managed seamlessly through Google Sheets as a NoSQL database. Locally, the application was structured with distinct directories: client-public for the customer storefront and client-admin for the secure management dashboard.

During local testing, the application relied on a multi-port setup (PORT=3000 for the public store and ADMIN_PORT=4000 for the admin server), alongside a local .env file housing secrets and JSON service account credentials.

Phase 2: Cloud Migration and Port Consolidation
Moving from local development to cloud production presented the first major architectural hurdle. Deploying the backend to Render revealed a critical hosting constraint: Render only allows a single incoming port per web service.

To resolve this, the codebase underwent a major refactor. The separate publicApp and adminApp instances were unified into a single Express application (app) running on a dynamic port (process.env.PORT). All static assets and API endpoints were funneled through this unified instance, ensuring Render could successfully host the entire backend without crashing.

Phase 3: Route Collisions and Authentication Overhaul
Once the backend was live, the admin panel encountered 401 Unauthorized errors during login attempts. Investigation revealed a "route collision": both the customer and admin login interfaces were attempting to hit the exact same /api/login endpoint, causing the server to evaluate admin requests against customer database sheets.

The fix involved decoupling the authentication doors:

Created a dedicated, secure /api/admin-login route in the backend.

Updated the frontend client-admin/app.js fetch requests to explicitly send a POST method with proper headers and JSON payloads.

Implemented JWT (JSON Web Token) middleware (authenticateToken) to protect sensitive admin operations, such as adding products and updating order statuses.

Migrated local secrets to Render’s secure cloud environment variables (JWT_SECRET).

Phase 4: Debugging and Stabilization
With the routes separated, the system faced minor hiccups, including undefined variable references and transient cloud spin-up delays. Utilizing a "detective mode" logging strategy in the backend pinpointed initialization bugs, which were quickly cleaned up. Additionally, managing Render's free-tier "sleep" behavior ensured that the backend gracefully woke up upon receiving requests from the frontends.
