# 0. Purpose and Scope

This document defines the engineering standards, workflow rules, and technical
constraints that govern all work on this repository. It applies to every
contributor, and in particular to any AI coding agent (including Cline)
generating or modifying code in this project.

**Project context:** This is a **Google Chrome browser extension**, targeting
**Manifest V3**, whose purpose is to **create notes for websites by URL** —
the user can add and manage notes associated with specific websites. The
repository currently starts from an empty state. No framework, build tool, or
language (JavaScript vs TypeScript) has been committed to yet. These rules
intentionally avoid locking in a specific technology stack; they define
*principles* that any future stack choice must respect. Stack decisions must
be made deliberately and driven by actual product/technical requirements, not
assumed in advance.

These rules are practical and enforceable. When in doubt, prefer the
simplest solution that correctly and safely satisfies the requirement.