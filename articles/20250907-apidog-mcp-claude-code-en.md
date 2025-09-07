---
title: "Streamlining API Development with Apidog MCP × Claude Code"
emoji: "⚡"
type: "tech"
topics: ["apidog", "mcp", "claudecode", "api"]
published: false
platforms:
  qiita: false
  devto: true
---

## 🎯 Article Overview

**Problems This Article Solves**
- API implementation and documentation gradually drift apart
- Manual specification management is tedious and easily forgotten
- Team development confusion over which API specification is current

**Target Readers**
- REST API developers
- OpenAPI/Swagger specification users
- AI development tool users (Claude Code, etc.)

**Prerequisites**
- REST API fundamentals
- Basic understanding of OpenAPI specifications
- Basic command-line operations

## 📊 Conclusion & Key Points

**🔧 What You Can Achieve**
- Automatic synchronization between API specifications and implementation code
- Automatic code updates when specifications change
- Simplified specification sharing across teams

**⚡ Development Transformation**
- Naturally develop specification-first habits
- Eliminate manual synchronization work
- Enable new team members to quickly understand current specifications

**🛠️ Technologies Used**
- **Apidog**: Browser-based API design and testing service
- **MCP (Model Context Protocol)**: AI tool integration mechanism
- **Claude Code**: MCP-compatible AI development environment

## 🤔 Common API Development Pain Points

### Common Scenarios
- Implementation is up-to-date, but documentation remains outdated
- Specification changes made but related areas forgotten to update
- New team members confused about which specification is correct
- Code review feedback: "This doesn't match the specification"

### New Approach

**🔄 Efficient Development Cycle**

1. **Specification Changes** (Apidog)
2. **AI-Assisted Implementation** (Claude Code)
3. **Testing**
4. **Feedback Integration** ⤴️ Back to 1

**Benefits**
- **Specification First**: Natural flow of creating specifications in Apidog first
- **Real-time Reflection**: Changes immediately reflected in development environment
- **AI Support**: AI generates code following specifications
- **Automated Synchronization**: Reduces drift between implementation and documentation

## 📸 What Apidog Can Do

*Note: Screen theme colors are customizable in settings*

**Request Parameter Configuration**
![Todo API Request Parameter Configuration Screen](https://raw.githubusercontent.com/pipipi-dev/pipipi-dev-articles/main/images/20250907-01-apidog-request-params.png)

*Intuitively edit parameter types, required/optional settings, and descriptions through forms*

**Response Definition**
![Todo API Response Definition Screen](https://raw.githubusercontent.com/pipipi-dev/pipipi-dev-articles/main/images/20250907-02-apidog-response-definition.png)

*Define response formats in detail with JSON schema, with automatic example generation*

**Request Code Samples**
![Todo API Request Code Sample Screen](https://raw.githubusercontent.com/pipipi-dev/pipipi-dev-articles/main/images/20250907-03-apidog-code-samples.png)

*Automatically generate sample code for multiple languages including JavaScript, Python, and cURL*

## 🛠️ Setup Guide

### 1. Create Apidog Account

1. Create account at [Apidog](https://apidog.com/)
2. Create new project

### 2. Obtain Access Token

```
Account Settings → API Access Token → "+ New" button
Name: Claude-Code-Integration (arbitrary)
Expiration: Never expire (or specify date)
```

### 3. Claude Code Configuration

> **Note**: MCP Server Naming Conventions
> 
> Claude Code recommends lowercase, hyphen-separated MCP server names.
> 
> ❌ Names with spaces:
> ```json
> "API specification": { ... }
> ```
> 
> ✅ Lowercase, hyphen-separated names:
> ```json
> "apidog": { ... }
> ```
> 
> Inappropriate names may cause connection errors.

**Configuration File Example**

```json
// Add to ~/.claude.json
{
  "mcpServers": {
    "apidog": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "apidog-mcp-server@latest",
        "--project-id=YOUR_PROJECT_ID"
      ],
      "env": {
        "APIDOG_ACCESS_TOKEN": "YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

### 4. Verification

```bash
# After restarting Claude Code, verify functionality
# Connection verification within Claude Code
# (Actual API access methods depend on MCP server implementation)
```

If successful, your created API list should be displayed.

*Note: If no APIs are created, please create a simple API first (e.g., GET /api/todos) before verification.*

### (Optional) Local File Testing

For testing with local OpenAPI specification files:

```json
{
  "mcpServers": {
    "apidog": {
      "command": "npx",
      "args": [
        "apidog-mcp-server@latest",
        "--oas=/path/to/openapi.json"
      ]
    }
  }
}
```

## 🔄 Development Workflow

### Human Role: Specification Creation in Apidog

**1. Browser-based Specification Creation**
- Create API specifications by simply filling out forms
- Configure parameters and responses through interface
- Real-time preview confirmation

**2. Browser-based Testing**
- Execute tests directly on created specifications
- Verify functionality with mock servers
- Automatically create response examples

**3. Team Collaboration**
- Real-time change synchronization
- Multiple version management
- Configurable team permissions

### AI Role: Implementation in Claude Code

**1. Automatic Latest Specification Retrieval**

Claude Code automatically retrieves the latest API specifications via MCP server and generates code based on them.

**2. Specification-based Code Generation**

```typescript
// Auto-generated from Apidog specification
interface CreateUserRequest {
  email: string;
  password: string;
  profile: {
    firstName: string;
    lastName: string;
    preferences?: UserPreferences;
  };
}

// Implementation also generated according to specification
async function createUser(
  request: CreateUserRequest
): Promise<CreateUserResponse> {
  // Validation, DB operations, response formatting
  // All generated based on specification
}
```

**3. Specification-based Implementation Support**

AI assists in implementation while referencing API specifications to ensure compliance.

## 💰 Pricing Plans

**Recommended for Individual Developers**

- **Free Plan**: Sufficient for individual API development and testing
  - Core functionality (up to 4 users)
  - Full API client support
  - Complete Mock/testing functionality
  - Unlimited test (collection) execution
  - Basic documentation features (unlimited views)
  - No credit card required, no expiration

- **Paid Plans**: For team development and production use
  - **Basic**: Advanced collaboration and team management for startups/small teams
  - **Professional**: Advanced collaboration, detailed management, and priority support for growing companies
  - **Enterprise**: Enterprise security, customization, and premium support for large organizations

**✅ Start with the free plan, then upgrade to paid plans based on team size and requirements**

For details, see [Apidog Pricing](https://apidog.com/pricing/).

## 📈 Expected Benefits

### Before and After Comparison

**Before: Traditional Development**

```
Spec Planning → Implementation → Manual Testing → Documentation
     ↓              ↓              ↓               ↓
   Uncertain    Error-prone      Tedious      Forgotten
```

- Half day to full day for one feature addition
- Specification changes requiring rework
- Frequently forgetting documentation updates

**After: Using Apidog MCP**

```
Apidog Design → MCP Implementation → Auto Testing → Auto Sync
      ↓                ↓                 ↓           ↓
    30 min           15 min            5 min      Instant
```

- One feature addition reduced to about 1 hour
- Significant reduction in implementation errors through type safety
- Documentation update work becomes unnecessary

### Achievable Benefits

**🎯 Improved Development Experience**
- Reduced time worrying "which specification is correct?"
- Quick access to previously written specifications
- Maintain consistency through specification-referenced implementation

**⚡ Enhanced Work Efficiency**
- End-to-end execution from API design to implementation
- Eliminate manual type definition writing
- Test code also auto-generated from specifications

**🔒 Quality Stability**
- Significant reduction in bugs from human error
- Consistent implementation based on specifications
- Enhanced validation through type safety

## 💡 Implementation Points and Future Outlook

### Recommended Gradual Introduction
Starting with small APIs and developing specification-first habits is important. Rather than starting with the entire team immediately, it works better to get familiar individually before expanding.

### Security Considerations
Be careful not to commit configuration files (~/.claude.json) containing access tokens to Git.

### Future Expectations
We expect further efficiency improvements in API development workflows as the MCP ecosystem expands, enabling connections with more tools and services.

## 📝 Summary

### What This Article Covered

✅ **Problem Solution**: Methods to prevent API specification and implementation drift
✅ **Concrete Steps**: Practical setup procedures you can try
✅ **Realistic Benefits**: Effects based on actual experience, not theory
✅ **Key Points**: Important considerations during implementation

### Steps to Get Started

1. **Create Apidog Account**
2. **Create One Simple API**
3. **Configure Claude Code MCP**
4. **Actually Try It Out**

### Final Thoughts

"API specification and implementation drift" is a problem many developers face daily.

Apidog MCP × Claude Code is a tool that simply solves this troublesome issue. Especially for those who frequently have exchanges like "Which specification is current?" and "Which is correct, implementation or specification?" in team development, you should feel significant benefits.

If you're interested, please start by trying to create one simple API.

## 📚 Reference Links

**Official Documentation**
- [Apidog Official Site](https://apidog.com/)
- [Claude Code](https://claude.ai/code)
- [MCP Specification](https://modelcontextprotocol.io/)

**Related Information**
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [REST API Design Guide](https://github.com/microsoft/api-guidelines)