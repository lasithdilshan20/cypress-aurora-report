# Contributing to Cypress Aurora Reporter

Thank you for your interest in contributing to Aurora Reporter! This document provides guidelines and information for contributors.

## 🎯 Ways to Contribute

- 🐛 **Bug Reports**: Help us identify and fix issues
- 💡 **Feature Requests**: Suggest new functionality
- 📝 **Documentation**: Improve our docs and examples
- 🔧 **Code Contributions**: Submit bug fixes and new features
- 🧪 **Testing**: Help us improve test coverage
- 🎨 **Design**: Enhance UI/UX of the dashboard

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm 8+
- Git
- Basic knowledge of TypeScript, React, and Cypress

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cypress-aurora-reporter.git
   cd cypress-aurora-reporter
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd src/dashboard && npm install && cd ../..
   ```

3. **Build and Test**
   ```bash
   npm run build
   npm test
   ```

4. **Start Development Mode**
   ```bash
   npm run dev
   ```

## 📋 Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - New features
- `bugfix/bug-description` - Bug fixes
- `docs/topic` - Documentation updates

### Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-new-feature
   ```

2. **Make Your Changes**
   - Follow our coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/amazing-new-feature
   ```

## 🔧 Coding Standards

### TypeScript Guidelines

```typescript
// ✅ Good - Use explicit types
interface TestResult {
  id: string;
  status: TestStatus;
  duration: number;
}

// ❌ Bad - Avoid any
const result: any = getTestResult();

// ✅ Good - Use proper error handling
try {
  await saveTestResult(result);
} catch (error) {
  logger.error('Failed to save test result:', error);
  throw error;
}
```

### React Component Guidelines

```typescript
// ✅ Good - Use proper TypeScript props
interface TestCardProps {
  test: TestResult;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

export const TestCard: React.FC<TestCardProps> = ({ 
  test, 
  onSelect, 
  isSelected = false 
}) => {
  // Component implementation
};

// ✅ Good - Use proper hooks
const TestList: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
  }, []);
};
```

### Code Style Rules

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multiline objects/arrays
- Prefer `const` over `let` when possible
- Use descriptive variable and function names
- Add JSDoc comments for public APIs

### Commit Message Format

We follow [Conventional Commits](https://conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(dashboard): add real-time test progress indicator
fix(plugin): resolve screenshot capture timing issue
docs(api): update configuration options documentation
test(database): add test coverage for cleanup functionality
```

## 🧪 Testing Guidelines

### Test Structure

```typescript
describe('TestResultRepository', () => {
  let repository: TestResultRepository;
  
  beforeEach(async () => {
    repository = new TestResultRepository(mockConnection);
  });

  describe('findById', () => {
    it('should return test result when found', async () => {
      // Arrange
      const testId = 'test-123';
      const expectedResult = createMockTestResult({ id: testId });
      mockConnection.get.mockResolvedValue(expectedResult);

      // Act
      const result = await repository.findById(testId);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockConnection.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [testId]
      );
    });

    it('should return null when not found', async () => {
      // Arrange
      mockConnection.get.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });
});
```

### Test Requirements

- **Unit Tests**: Cover all public methods and edge cases
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows
- **Coverage**: Maintain >90% test coverage
- **Mocking**: Mock external dependencies appropriately

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- database.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 📚 Documentation Guidelines

### Code Documentation

```typescript
/**
 * Retrieves test results with optional filtering and pagination.
 * 
 * @param filters - Optional filters to apply to the search
 * @param options - Pagination and sorting options
 * @returns Promise that resolves to filtered test results
 * 
 * @example
 * ```typescript
 * const results = await getTestResults({
 *   status: ['failed'],
 *   hasScreenshots: true
 * }, {
 *   limit: 50,
 *   offset: 0,
 *   sortBy: 'startTime'
 * });
 * ```
 */
export async function getTestResults(
  filters?: TestFilter,
  options?: PaginationOptions
): Promise<TestResult[]> {
  // Implementation
}
```

### README Updates

When adding new features:

1. Update the feature list
2. Add configuration examples
3. Include usage examples
4. Update API documentation
5. Add screenshots if UI changes

### Changelog

We maintain a changelog following [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [1.2.0] - 2024-01-15

### Added
- Real-time test progress indicators
- Advanced filtering for test results
- Export functionality for test reports

### Changed
- Improved dashboard performance
- Updated chart library to latest version

### Fixed
- Screenshot capture timing issues
- Database connection pool leaks

### Deprecated
- Legacy configuration format (will be removed in v2.0)
```

## 🐛 Bug Reports

### Before Submitting

1. Check existing issues for duplicates
2. Verify you're using the latest version
3. Test with minimal reproduction case

### Bug Report Template

```markdown
**Bug Description**
A clear description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- Aurora Reporter version: [e.g. 1.0.0]
- Cypress version: [e.g. 12.0.0]
- Node.js version: [e.g. 18.0.0]
- OS: [e.g. macOS 13.0]
- Browser: [e.g. Chrome 108]

**Additional Context**
- Configuration used
- Console logs/errors
- Screenshots (if applicable)
```

## 💡 Feature Requests

### Feature Request Template

```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
How would you like this feature to work?

**Alternatives Considered**
Other solutions you've considered.

**Additional Context**
Any other context, mockups, or examples.
```

## 🔍 Code Review Process

### For Contributors

1. **Self-Review**: Review your own code before submitting
2. **Documentation**: Ensure code is well-documented
3. **Tests**: Include comprehensive tests
4. **Performance**: Consider performance implications

### Review Criteria

- ✅ Code follows project conventions
- ✅ Changes are well-tested
- ✅ Documentation is updated
- ✅ No breaking changes without discussion
- ✅ Performance considerations addressed
- ✅ Security implications considered

### Review Timeline

- **Small Changes**: 1-2 days
- **Medium Changes**: 3-5 days  
- **Large Changes**: 1-2 weeks

## 🏆 Recognition

Contributors will be:

- Listed in our contributors section
- Mentioned in release notes for significant contributions
- Invited to our contributor Discord channel
- Eligible for contributor swag

## ❓ Questions?

- 💬 [GitHub Discussions](https://github.com/yourusername/cypress-aurora-reporter/discussions)
- 📧 Email: contributors@aurora-reporter.dev
- 🐦 Twitter: [@aurora_reporter](https://twitter.com/aurora_reporter)

Thank you for contributing to Aurora Reporter! 🚀