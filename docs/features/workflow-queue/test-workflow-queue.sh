#!/bin/bash

# Workflow Queue - Automated Testing & Validation Script
#
# This script runs all type-check, lint, and build validations
# required before committing the workflow-queue feature.
#
# Usage: ./test-workflow-queue.sh

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}============================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================${NC}"
  echo ""
}

print_step() {
  echo -e "${YELLOW}→ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Start
print_header "Workflow Queue - Testing & Validation Suite"

# Get the repo root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

print_info "Repository: $(pwd)"
print_info "Branch: $(git rev-parse --abbrev-ref HEAD)"
print_info "Date: $(date)"
echo ""

# Phase 1: Validation
print_header "Phase 1: Pre-Integration Validation"

# Check Node/Bun
print_step "Checking Bun installation..."
if ! command -v bun &> /dev/null; then
  print_error "Bun not found. Please install Bun first."
  exit 1
fi
print_success "Bun $(bun --version) found"

# Type Check
print_step "Running type-check..."
if bun run type-check > /tmp/type-check.log 2>&1; then
  print_success "Type-check passed"
else
  print_error "Type-check failed"
  echo ""
  echo "Type-check output:"
  cat /tmp/type-check.log | head -50
  exit 1
fi

# Lint
print_step "Running lint..."
if bun run lint > /tmp/lint.log 2>&1; then
  print_success "Lint passed"
else
  print_error "Lint failed"
  echo ""
  echo "Lint output:"
  cat /tmp/lint.log | head -50
  exit 1
fi

# Build
print_step "Running build..."
if bun run build > /tmp/build.log 2>&1; then
  print_success "Build passed"
else
  print_error "Build failed"
  echo ""
  echo "Build output:"
  cat /tmp/build.log | tail -50
  exit 1
fi

echo ""

# Phase 2: File Checks
print_header "Phase 2: Feature Files Validation"

declare -a FILES=(
  "packages/ui/src/stores/useWorkflowQueueStore.ts"
  "packages/ui/src/hooks/useWorkflowQueue.ts"
  "packages/ui/src/components/chat/WorkflowInput.tsx"
  "docs/WORKFLOW_QUEUE_TECHNICAL.md"
  "docs/WORKFLOW_QUEUE_INTEGRATION.md"
  "docs/WORKFLOW_QUEUE_TESTING_GUIDE.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    print_success "Found: $file"
  else
    print_error "Missing: $file"
    exit 1
  fi
done

echo ""

# Phase 3: Git Status
print_header "Phase 3: Git Status Check"

print_step "Current branch..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "  Branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "feat/workflow-queue" ]; then
  print_error "Not on feat/workflow-queue branch. Current: $CURRENT_BRANCH"
  exit 1
fi
print_success "On correct branch"

print_step "Checking staged files..."
STAGED_COUNT=$(git diff --cached --name-only | wc -l)
echo "  Staged files: $STAGED_COUNT"

if [ $STAGED_COUNT -eq 0 ]; then
  print_info "No files staged yet. Stage with: git add -A"
else
  print_success "Files ready to commit"
  git diff --cached --name-only | sed 's/^/    /'
fi

echo ""

# Phase 4: Summary
print_header "Validation Summary"

echo "✓ Type-check: PASSED"
echo "✓ Lint: PASSED"
echo "✓ Build: PASSED"
echo "✓ Files: ALL PRESENT"
echo "✓ Git: ON CORRECT BRANCH"
echo ""

print_success "ALL VALIDATIONS PASSED"
echo ""

# Phase 5: Next Steps
print_header "Next Steps"

echo "1. Review the feature files:"
echo "   - packages/ui/src/stores/useWorkflowQueueStore.ts"
echo "   - packages/ui/src/hooks/useWorkflowQueue.ts"
echo "   - packages/ui/src/components/chat/WorkflowInput.tsx"
echo ""

echo "2. Stage and commit changes:"
echo "   git add -A"
echo "   git commit -m 'feat(workflow-queue): add workflow queue system'"
echo ""

echo "3. Next phase (Integration):"
echo "   - Read: docs/WORKFLOW_QUEUE_INTEGRATION.md"
echo "   - Modify: packages/ui/src/components/chat/ChatInput.tsx"
echo "   - Add toggle between Manual and Workflow modes"
echo ""

echo "4. Run manual tests:"
echo "   - Follow: docs/WORKFLOW_QUEUE_TESTING_GUIDE.md"
echo "   - Phase 1-3 (before integration)"
echo "   - Phase 4-5 (after integration)"
echo ""

print_header "Ready for Commit!"
echo ""
echo "Run this to commit:"
echo "  git add -A && git commit -m 'feat(workflow-queue): add workflow queue system'"
echo ""

print_success "Happy coding! 🚀"
