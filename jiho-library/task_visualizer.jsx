<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tasks JSON Visualizer</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@300;500;700;900&display=swap');
        
        :root {
            --primary: #6366f1;
            --primary-light: #818cf8;
            --primary-dark: #4f46e5;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --bg-dark: #0f172a;
            --bg-card: #1e293b;
            --bg-hover: #334155;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --border: #334155;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Outfit', sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 2rem;
            overflow-x: hidden;
        }
        
        .tabs-container {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 1rem;
            margin-bottom: 2rem;
            animation: fadeInUp 0.8s ease-out 0.6s backwards;
        }
        
        .tabs {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        .tab {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            font-weight: 600;
            padding: 0.75rem 1.5rem;
            border-radius: 10px;
            background: transparent;
            border: 2px solid transparent;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            position: relative;
        }
        
        .tab:hover {
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.05);
        }
        
        .tab.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary-light);
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        }
        
        .tab-count {
            display: inline-block;
            margin-left: 0.5rem;
            padding: 0.125rem 0.5rem;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            font-size: 0.75rem;
        }
        
        .tab.active .tab-count {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        header {
            text-align: center;
            margin-bottom: 2rem;
            position: relative;
        }
        
        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 3rem;
            font-weight: 900;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
            letter-spacing: -0.02em;
            animation: fadeInUp 0.8s ease-out;
        }
        
        .subtitle {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1rem;
            color: var(--text-secondary);
            font-weight: 400;
            animation: fadeInUp 0.8s ease-out 0.2s backwards;
        }
        
        .metadata {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            animation: fadeInUp 0.8s ease-out 0.4s backwards;
        }
        
        .metadata-item {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .metadata-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-secondary);
            font-weight: 600;
        }
        
        .metadata-value {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary-light);
        }
        
        .features-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .feature-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            overflow: hidden;
            transition: all 0.3s ease;
            animation: fadeInUp 0.8s ease-out backwards;
        }
        
        .feature-card.expanded {
            border-color: var(--primary);
        }
        
        .feature-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.25rem 1.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
            background: var(--bg-card);
            user-select: none;
        }
        
        .feature-header:hover {
            background: var(--bg-hover);
        }
        
        .feature-card.expanded .feature-header {
            background: rgba(99, 102, 241, 0.1);
            border-bottom: 1px solid var(--border);
        }
        
        .feature-left {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex: 1;
        }
        
        .feature-number {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 700;
            background: var(--primary);
            color: white;
            padding: 0.5rem 0.875rem;
            border-radius: 8px;
            letter-spacing: 0.05em;
            min-width: 60px;
            text-align: center;
        }
        
        .feature-name {
            font-size: 1.25rem;
            font-weight: 700;
        }
        
        .feature-right {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .feature-count {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--text-secondary);
            background: rgba(255, 255, 255, 0.05);
            padding: 0.375rem 0.75rem;
            border-radius: 6px;
        }
        
        .design-badge {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.625rem;
            font-weight: 600;
            background: linear-gradient(135deg, #a855f7, #ec4899);
            color: white;
            padding: 0.375rem 0.75rem;
            border-radius: 16px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
        
        .expand-icon {
            font-size: 1.25rem;
            color: var(--text-secondary);
            transition: transform 0.3s ease;
        }
        
        .feature-card.expanded .expand-icon {
            transform: rotate(180deg);
        }
        
        .feature-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        
        .feature-card.expanded .feature-content {
            max-height: 10000px;
        }
        
        .tasks-list {
            padding: 0;
        }
        
        .task-item {
            background: var(--bg-dark);
            border-left: 4px solid;
            padding: 1.25rem 1.5rem;
            transition: all 0.3s ease;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            position: relative;
        }
        
        .task-item:last-child {
            border-bottom: none;
        }
        
        .task-item.pending { border-left-color: var(--warning); }
        .task-item.in_progress { border-left-color: var(--primary); }
        .task-item.completed { border-left-color: var(--success); }
        
        .task-item:hover {
            background: var(--bg-hover);
            padding-left: 2rem;
        }
        
        .task-item.expanded {
            background: var(--bg-hover);
        }
        
        .task-main {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            justify-content: space-between;
        }
        
        .task-main-left {
            flex: 1;
            min-width: 0;
        }
        
        .task-main-right {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-shrink: 0;
        }
        
        .task-id {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--primary-light);
            margin-bottom: 0.5rem;
        }
        
        .task-title {
            font-size: 1rem;
            font-weight: 600;
            line-height: 1.5;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        
        .task-title.design-review {
            color: #ec4899;
        }
        
        .task-summary {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .task-badges {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        .badge {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.625rem;
            font-weight: 700;
            padding: 0.25rem 0.625rem;
            border-radius: 6px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .status-pending { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5); }
        .status-in_progress { background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.5); }
        .status-completed { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.5); }
        
        .priority-high { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5); }
        .priority-medium { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5); }
        .priority-low { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.5); }
        
        .stage-badge {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.625rem;
            font-weight: 700;
            padding: 0.375rem 0.75rem;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
        
        .stage-implementation {
            background: rgba(99, 102, 241, 0.2);
            color: #818cf8;
            border: 1px solid rgba(99, 102, 241, 0.5);
        }
        
        .stage-design-review {
            background: rgba(236, 72, 153, 0.2);
            color: #f9a8d4;
            border: 1px solid rgba(236, 72, 153, 0.5);
        }
        
        .expand-toggle {
            font-size: 1rem;
            color: var(--text-secondary);
            transition: transform 0.3s ease;
        }
        
        .task-item.expanded .expand-toggle {
            transform: rotate(180deg);
        }
        
        .task-details {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            margin-top: 0;
        }
        
        .task-item.expanded .task-details {
            max-height: 1000px;
            margin-top: 1rem;
        }
        
        .task-details-content {
            padding-top: 1rem;
            border-top: 1px solid var(--border);
        }
        
        .detail-section {
            margin-bottom: 1rem;
        }
        
        .detail-section:last-child {
            margin-bottom: 0;
        }
        
        .detail-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
        }
        
        .dependencies {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .dependency-tag {
            font-family: 'JetBrains Mono', monospace;
            background: rgba(99, 102, 241, 0.15);
            color: var(--primary-light);
            padding: 0.375rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }
        
        .files-list {
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
        }
        
        .file-item {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--text-secondary);
            background: rgba(255, 255, 255, 0.05);
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .file-icon {
            color: var(--primary-light);
        }
        
        .dates-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .date-item {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        
        .date-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            color: var(--text-primary);
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2.5rem;
            }
            
            .tasks-grid {
                grid-template-columns: 1fr;
            }
            
            .metadata {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📋 Tasks Visualizer</h1>
            <p class="subtitle">// Frontend Development Task Management System</p>
        </header>
        
        <div class="metadata" id="metadata">
            <!-- Metadata will be inserted here -->
        </div>
        
        <div class="tabs-container">
            <div class="tabs" id="tabs">
                <!-- Tabs will be inserted here -->
            </div>
        </div>
        
        <div class="features-container" id="features">
            <!-- Features will be inserted here -->
        </div>
    </div>
    
    <script>
        // Sample data - replace with your actual data
        const tasksData = {
            "metadata": {
                "created_at": "2025-01-01T00:00:00",
                "last_updated": "2025-01-01T00:00:00",
                "version": "1.0",
                "TotalTasks": 6
            },
            "features": [
                {
                    "number": "F00",
                    "name": "프로젝트 설정",
                    "design_validation_required": false,
                    "tasks": [
                        {
                            "id": "task-001",
                            "title": "Next.js 프로젝트 초기화",
                            "status": "pending",
                            "priority": "high",
                            "stage": "implementation",
                            "dependencies": [],
                            "files": ["next.config.js", "package.json"],
                            "created_at": "2025-01-01T00:00:00",
                            "updated_at": "2025-01-01T00:00:00"
                        },
                        {
                            "id": "task-design-001",
                            "title": "[Design Review] 프로젝트 설정 디자인 리뷰 및 접근성 검증",
                            "status": "pending",
                            "priority": "low",
                            "stage": "design-review",
                            "dependencies": ["task-001"],
                            "files": ["next.config.js", "package.json"],
                            "created_at": "2025-01-01T00:00:00",
                            "updated_at": "2025-01-01T00:00:00"
                        }
                    ]
                },
                {
                    "number": "F01",
                    "name": "공통 컴포넌트",
                    "design_validation_required": false,
                    "tasks": [
                        {
                            "id": "task-002",
                            "title": "Button 컴포넌트 구현",
                            "status": "in_progress",
                            "priority": "high",
                            "stage": "implementation",
                            "dependencies": ["task-001"],
                            "files": ["components/ui/Button.tsx"],
                            "created_at": "2025-01-01T00:00:00",
                            "updated_at": "2025-01-01T00:00:00"
                        },
                        {
                            "id": "task-design-002",
                            "title": "[Design Review] 공통 컴포넌트 디자인 리뷰 및 접근성 검증",
                            "status": "pending",
                            "priority": "medium",
                            "stage": "design-review",
                            "dependencies": ["task-002"],
                            "files": ["components/ui/Button.tsx"],
                            "created_at": "2025-01-01T00:00:00",
                            "updated_at": "2025-01-01T00:00:00"
                        }
                    ]
                },
                {
                    "number": "F02",
                    "name": "홈페이지",
                    "design_validation_required": true,
                    "tasks": [
                        {
                            "id": "task-003",
                            "title": "홈페이지 UI 구현",
                            "status": "pending",
                            "priority": "medium",
                            "stage": "implementation",
                            "dependencies": ["task-002"],
                            "files": ["app/page.tsx"],
                            "created_at": "2025-01-01T00:00:00",
                            "updated_at": "2025-01-01T00:00:00"
                        },
                        {
                            "id": "task-004",
                            "title": "홈페이지 데이터 연동",
                            "status": "completed",
                            "priority": "high",
                            "stage": "implementation",
                            "dependencies": ["task-003"],
                            "files": ["app/page.tsx", "services/homeService.ts"],
                            "created_at": "2025-01-01T00:00:00",
                            "updated_at": "2025-01-02T00:00:00"
                        },
                        {
                            "id": "task-design-003",
                            "title": "[Design Review] 홈페이지 디자인 리뷰 및 접근성 검증",
                            "status": "pending",
                            "priority": "high",
                            "stage": "design-review",
                            "dependencies": ["task-004"],
                            "files": ["app/page.tsx", "services/homeService.ts"],
                            "created_at": "2025-01-01T00:00:00",
                            "updated_at": "2025-01-01T00:00:00"
                        }
                    ]
                }
            ]
        };
        
        let currentFilter = 'all';
        
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        function getTaskCounts(tasks) {
            return {
                all: tasks.length,
                pending: tasks.filter(t => t.status === 'pending').length,
                in_progress: tasks.filter(t => t.status === 'in_progress').length,
                completed: tasks.filter(t => t.status === 'completed').length
            };
        }
        
        function getAllTaskCounts() {
            let allTasks = [];
            tasksData.features.forEach(feature => {
                allTasks = allTasks.concat(feature.tasks);
            });
            return getTaskCounts(allTasks);
        }
        
        function renderTabs() {
            const counts = getAllTaskCounts();
            const tabsEl = document.getElementById('tabs');
            
            const tabs = [
                { id: 'all', label: 'All Tasks', count: counts.all },
                { id: 'pending', label: 'Pending', count: counts.pending },
                { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
                { id: 'completed', label: 'Completed', count: counts.completed }
            ];
            
            tabsEl.innerHTML = tabs.map(tab => `
                <button class="tab ${currentFilter === tab.id ? 'active' : ''}" onclick="filterTasks('${tab.id}')">
                    ${tab.label}
                    <span class="tab-count">${tab.count}</span>
                </button>
            `).join('');
        }
        
        function filterTasks(filter) {
            currentFilter = filter;
            renderTabs();
            renderFeatures();
        }
        
        function renderMetadata(metadata) {
            const metadataEl = document.getElementById('metadata');
            metadataEl.innerHTML = `
                <div class="metadata-item">
                    <div class="metadata-label">Total Tasks</div>
                    <div class="metadata-value">${metadata.TotalTasks}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Version</div>
                    <div class="metadata-value">${metadata.version}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Created</div>
                    <div class="metadata-value">${formatDate(metadata.created_at)}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Last Updated</div>
                    <div class="metadata-value">${formatDate(metadata.last_updated)}</div>
                </div>
            `;
        }
        
        function renderTask(task) {
            const isDesignReview = task.stage === 'design-review';
            return `
                <div class="task-item ${task.status}" onclick="toggleTask(event, '${task.id}')">
                    <div class="task-main">
                        <div class="task-main-left">
                            <div class="task-id">${task.id}</div>
                            <div class="task-title ${isDesignReview ? 'design-review' : ''}">${task.title}</div>
                            <div class="task-summary">
                                <div class="task-badges">
                                    <span class="badge status-${task.status}">${task.status}</span>
                                    <span class="badge priority-${task.priority}">${task.priority}</span>
                                    <span class="stage-badge stage-${task.stage}">${task.stage}</span>
                                </div>
                            </div>
                        </div>
                        <div class="task-main-right">
                            <span class="expand-toggle">▼</span>
                        </div>
                    </div>
                    <div class="task-details">
                        <div class="task-details-content">
                            ${task.dependencies.length > 0 ? `
                                <div class="detail-section">
                                    <div class="detail-label">Dependencies</div>
                                    <div class="dependencies">
                                        ${task.dependencies.map(dep => `<span class="dependency-tag">${dep}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${task.files.length > 0 ? `
                                <div class="detail-section">
                                    <div class="detail-label">Files (${task.files.length})</div>
                                    <div class="files-list">
                                        ${task.files.map(file => `
                                            <div class="file-item">
                                                <span class="file-icon">📄</span>
                                                ${file}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="detail-section">
                                <div class="detail-label">Timeline</div>
                                <div class="dates-grid">
                                    <div class="date-item">
                                        <div class="detail-label">Created</div>
                                        <div class="date-value">${formatDate(task.created_at)}</div>
                                    </div>
                                    <div class="date-item">
                                        <div class="detail-label">Updated</div>
                                        <div class="date-value">${formatDate(task.updated_at)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        function renderFeature(feature, index) {
            let filteredTasks = feature.tasks;
            if (currentFilter !== 'all') {
                filteredTasks = feature.tasks.filter(task => task.status === currentFilter);
            }
            
            if (filteredTasks.length === 0) {
                return '';
            }
            
            return `
                <div class="feature-card" style="animation-delay: ${0.1 * index}s">
                    <div class="feature-header" onclick="toggleFeature('${feature.number}')">
                        <div class="feature-left">
                            <span class="feature-number">${feature.number}</span>
                            <h2 class="feature-name">${feature.name}</h2>
                        </div>
                        <div class="feature-right">
                            <span class="feature-count">${filteredTasks.length} task${filteredTasks.length > 1 ? 's' : ''}</span>
                            ${feature.design_validation_required ? '<span class="design-badge">Design Validation</span>' : ''}
                            <span class="expand-icon">▼</span>
                        </div>
                    </div>
                    <div class="feature-content">
                        <div class="tasks-list">
                            ${filteredTasks.map(task => renderTask(task)).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
        
        function renderFeatures() {
            const featuresEl = document.getElementById('features');
            const html = tasksData.features
                .map((feature, index) => renderFeature(feature, index))
                .filter(html => html !== '')
                .join('');
            
            featuresEl.innerHTML = html || '<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">No tasks found for this filter.</div>';
        }
        
        function toggleFeature(featureNumber) {
            const featureCard = event.currentTarget.closest('.feature-card');
            featureCard.classList.toggle('expanded');
        }
        
        function toggleTask(event, taskId) {
            const taskItem = event.currentTarget;
            taskItem.classList.toggle('expanded');
        }
        
        // Initialize
        renderMetadata(tasksData.metadata);
        renderTabs();
        renderFeatures();
    </script>
</body>
</html>