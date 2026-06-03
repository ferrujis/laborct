"""
FJ Analytics SaaS - Visual Summary
"""

import os

# This module generates visual summary HTML pages for the SaaS documentation
# and setup visualization

VISUAL_SUMMARY_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FJ Analytics SaaS - Architecture</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 40px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { font-size: 2.5rem; color: #38bdf8; margin-bottom: 10px; }
        .subtitle { color: #94a3b8; margin-bottom: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
        .card { background: #1e293b; border-radius: 16px; padding: 24px; border: 1px solid #334155; }
        .card h3 { color: #38bdf8; margin-bottom: 16px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }
        .card ul { list-style: none; }
        .card li { padding: 8px 0; border-bottom: 1px solid #334155; font-size: 0.9rem; }
        .card li:last-child { border: none; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
        .badge-green { background: #065f46; color: #34d399; }
        .badge-blue { background: #0c4a6e; color: #38bdf8; }
        .badge-purple { background: #581c87; color: #a78bfa; }
        .badge-amber { background: #713f12; color: #fbbf24; }
        .architecture { background: #1e293b; border-radius: 16px; padding: 32px; margin-top: 40px; text-align: center; }
        .flow { display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: wrap; margin-top: 24px; }
        .node { background: #334155; padding: 16px 24px; border-radius: 12px; font-weight: 600; min-width: 120px; }
        .arrow { color: #38bdf8; font-size: 1.5rem; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 40px; }
        .feature { background: #1e293b; border-radius: 12px; padding: 20px; border-left: 4px solid #38bdf8; }
        .feature h4 { color: #fff; margin-bottom: 8px; }
        .feature p { color: #94a3b8; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 FJ Analytics SaaS</h1>
        <p class="subtitle">Business Intelligence Platform for Veterinary Clinics & Medical Practices</p>

        <div class="grid">
            <div class="card">
                <h3>🖥️ Frontend (SPA)</h3>
                <ul>
                    <li>Single Page Application</li>
                    <li>Dark theme UI design</li>
                    <li>Chart.js visualizations</li>
                    <li>Excel file processing</li>
                </ul>
            </div>
            <div class="card">
                <h3>⚙️ Backend (API)</h3>
                <ul>
                    <li>Node.js + Express</li>
                    <li>JWT Authentication</li>
                    <li>Role-based access control</li>
                    <li>Rate limiting</li>
                </ul>
            </div>
            <div class="card">
                <h3>🗄️ Database</h3>
                <ul>
                    <li>SQLite (development)</li>
                    <li>Multi-tenant architecture</li>
                    <li>Access audit logging</li>
                    <li>File metadata storage</li>
                </ul>
            </div>
        </div>

        <div class="architecture">
            <h3 style="color: #fff; margin-bottom: 20px;">System Architecture</h3>
            <div class="flow">
                <div class="node">👤 Browser</div>
                <span class="arrow">→</span>
                <div class="node">🐳 Frontend</div>
                <span class="arrow">→</span>
                <div class="node">⚡ Backend API</div>
                <span class="arrow">→</span>
                <div class="node">🗄️ SQLite</div>
            </div>
        </div>

        <div class="features">
            <div class="feature">
                <h4>🔐 Security First</h4>
                <p>JWT tokens, bcrypt passwords, Helmet security headers, CORS controls, rate limiting, audit logging</p>
            </div>
            <div class="feature">
                <h4>☸️ Kubernetes Ready</h4>
                <p>Containerized deployment with health checks, rolling updates, persistent storage, ingress routing</p>
            </div>
            <div class="feature">
                <h4>📊 Data Analytics</h4>
                <p>4 modules: LaborBI, CogsBI, InsightsAI, AdminCenter with KPIs, charts, and rankings</p>
            </div>
            <div class="feature">
                <h4>📱 Multi-Tenant</h4>
                <p>Scalable architecture supporting multiple organizations with isolated data</p>
            </div>
            <div class="feature">
                <h4>🧪 E2E Tested</h4>
                <p>Playwright tests covering authentication, navigation, admin functions, and accessibility</p>
            </div>
            <div class="feature">
                <h4>📋 Excel Ready</h4>
                <p>Drag-and-drop file upload for Base, Analysis, Costs, and Schedule templates</p>
            </div>
        </div>
    </div>
</body>
</html>
"""

def generate_visual_summary():
    output_path = os.path.join(os.path.dirname(__file__), 'visual-summary.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(VISUAL_SUMMARY_TEMPLATE)
    print(f"✅ Visual summary created: {output_path}")

if __name__ == '__main__':
    generate_visual_summary()
