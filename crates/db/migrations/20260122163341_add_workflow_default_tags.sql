-- Add workflow default tags

-- 1. planning tag
INSERT INTO tags (id, tag_name, content, created_at, updated_at)
VALUES (
    randomblob(16),
    'planning',
    'execute workflow. @.claude/scripts/FE-workflow/workflow.json with @seed-docs folder.
don''t bother me until you finish.',
    datetime('now', 'subsec'),
    datetime('now', 'subsec')
);

-- 2. clarify-requirements tag
INSERT INTO tags (id, tag_name, content, created_at, updated_at)
VALUES (
    randomblob(16),
    'clarify-requirements',
    'Use plan mode to ask the user for missing information and refine the feedback through confirmation.
Once the requirements are sufficiently specified, 
execute the /change-docs skill and update the changes for the files in docs.',
    datetime('now', 'subsec'),
    datetime('now', 'subsec')
);

-- 3. setup-tweakcn tag
INSERT INTO tags (id, tag_name, content, created_at, updated_at)
VALUES (
    randomblob(16),
    'setup-tweakcn',
    'Install the tweakcn URL provided by the user, then ask for the project name.',
    datetime('now', 'subsec'),
    datetime('now', 'subsec')
);

-- 4. develop--designpage-first tag
INSERT INTO tags (id, tag_name, content, created_at, updated_at)
VALUES (
    randomblob(16),
    'develop--designpage-first',
    '/feature-executor
@tasks/tasks.json에서 design_validation_required = true로설정된 feature들까지 개발해줘',
    datetime('now', 'subsec'),
    datetime('now', 'subsec')
);

-- 5. feedback-after-development tag
INSERT INTO tags (id, tag_name, content, created_at, updated_at)
VALUES (
    randomblob(16),
    'feedback-after-development',
    'Use plan mode to ask the user for missing information and refine the feedback through confirmation.
Once the requirements are sufficiently specified, 
first execute the /change-analyzer skill to create a change requirements document, 
then execute the /change-docs skill to update the files in docs.',
    datetime('now', 'subsec'),
    datetime('now', 'subsec')
);

-- 6. develop--all tag
INSERT INTO tags (id, tag_name, content, created_at, updated_at)
VALUES (
    randomblob(16),
    'develop--all',
    '/feature-executor

Use @tasks/tasks.json as the single source of truth.
Refer to the latest change-YYYY-MM-DD-HHMM.json documents in the @tasks/changes folder for details.

Execution rules:

1. A feature is considered "remaining" if it contains at least one task with status != "done".
2. Execute all remaining features.
3. For each feature:
   - If a feature plan/spec already exists, DO NOT run /feature-spec.
   - If no plan/spec exists, run /feature-spec first.
4. After plan resolution, develop at the task level.
5. Skip tasks already marked as "done".
6. Execute tasks in logical order within a feature, considering dependencies.
7. If tasks are independent, execute them in parallel.
8. Do NOT ask the user for confirmation unless information is missing.',
    datetime('now', 'subsec'),
    datetime('now', 'subsec')
);
