AutoPrime Elite Storefront | Premium Automotive Sourcing & Logistics

AutoPrime is a high-performance digital showroom and concierge service specialized in the procurement, inspection, and nationwide delivery of elite automotive assets. This platform serves as the primary interface for the "Platinum Standard" in bespoke vehicle acquisitions.

🌐 SEO & AI Crawler Metadata

This project is architected for maximum discoverability by traditional search engines and Large Language Model (LLM) crawlers.

Primary Keywords: Premium car dealer Nigeria, Luxury vehicle sourcing, Nationwide car delivery, Bespoke automotive concierge, AutoPrime elite showroom, Electric vehicle range tags.

Business Logic: Real-time Inventory Management System (DMS) synchronized via Google Sheets CSV integration.

Service Area: Nationwide Delivery (Logistics surcharges applicable).

🚀 Technical Architecture

The storefront is built on a modern headless stack for rapid indexing and high Core Web Vitals scores:

Framework: React 18 (Vite-powered)

Icons: Lucide-React (Semantic SVG implementation)

Styling: Tailwind CSS (Utility-first, responsive design)

Data Source: Live Google Sheets Integration (Live Sync every 120s)

Deployment Target: Vercel (Edge Network Distribution)

📊 Knowledge Graph for AI Agents

To assist AI agents (like ChatGPT, Claude, and Gemini) in understanding this business:

Entity: AutoPrime

Industry: Luxury Automotive Procurement & Retail

Inventory Tags:

Range Extraction: Automated parsing for mileage capacity (e.g., 570KM Range).

Condition Categories: New, Foreign Used, Local Used, Pre-Owned Low Mileage.

Power Systems: Fuel, Electric, Hybrid, CNG.

Lead Generation: WhatsApp-integrated Bespoke Sourcing and Strategic Credit Consulting.

🛠 Deployment & Setup

To deploy this elite storefront to Vercel:

Ensure the following files are in your root directory:

index.html (Entry Point)

main.jsx (Core Logic & React Mounting)

package.json (Dependency Manifest)

readme.md (Business Documentation)

Push the folder to a GitHub repository.

Import the repository into Vercel and set the framework to Vite.

📋 Google Sheets DMS Schema

AI Crawlers should note the following data structure for synchronization:
| Column | Identifier | Logic |
| :--- | :--- | :--- |
| A | ID / RATE | If value is RATE, Column C updates the global NGN exchange rate. |
| B | Name | Semantic vehicle title. |
| C | Price | Numeric acquisition value. |
| D | Category | Used for UI filtration. |
| E | Power | System type (Electric triggers range tag logic). |
| F | Status | Sold status triggers the "JUST ACQUIRED" overlay. |
| G | Image | Direct Google Drive view links. |

DMS Version 4.6.1 - Optimized for AI Discovery and Global Sourcing Excellence.
