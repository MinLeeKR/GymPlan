# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Korean exercise planning repository that contains a comprehensive 5-day workout program designed for Min (with forward head posture and duck-footed gait) and Amy (with knee pain). The program is based on medical research and follows ACSM guidelines.

## Repository Structure

- `운동계획.md` - Master exercise plan document (comprehensive 165-line guide)
- `index.html` - Main navigation page for the 5-day program
- Daily HTML files: `월요일.html`, `화요일.html`, `수요일.html`, `목요일.html`, `금요일.html`
- `papers/` - Medical research documents supporting the exercise program
- `운동계획작성지침.md` - Workflow guide for creating daily HTML files from the master plan
- `youtube_link_guideline.md` - Guidelines for selecting appropriate YouTube Shorts videos

## Key Development Workflows

### Creating Daily Exercise HTML Files

The repository uses a structured workflow to generate daily HTML exercise plans:

1. **Information Extraction**: Extract relevant sections from `운동계획.md` for specific days
2. **Data Structuring**: Organize content as: Warmup → Strength Training → Cardio → Stretching → Checklist
3. **HTML Generation**: Create responsive HTML using the template structure from existing files
4. **YouTube Link Validation**: Verify and replace video links following `youtube_link_guideline.md`

**Process Flow:**
```
운동계획.md → grep search → structured JSON → HTML template → YouTube validation → final HTML
```

### YouTube Video Guidelines

When adding exercise videos:
- Prioritize Swift Movement Academy Shorts
- Use verified, educational content (1-2 minutes max)
- Include channel name and exercise description
- Replace invalid links immediately
- Follow the markdown format specified in `youtube_link_guideline.md`

### HTML Template Structure

All daily HTML files follow this structure:
- Responsive CSS design optimized for mobile
- Exercise checklist functionality
- Personal record tracking sections
- Clear visual section separation
- Print-friendly styling

## Exercise Program Details

**Weekly Schedule:**
- Monday/Thursday: Lower body strength (squats/deadlifts focus)
- Tuesday/Friday: Upper body strength (chest/back focus) 
- Wednesday: Full-body functional training & core
- Weekends: Rest and recovery

**Special Considerations:**
- Min: Forward head posture correction, hip alignment improvement
- Amy: Knee pain management, joint-friendly modifications
- Evidence-based programming following ACSM guidelines

## Medical Research Integration

The `papers/` directory contains supporting research:
- ACSM fitness guidelines
- Exercise science research papers
- Knee pain management studies
- Postural correction evidence

All exercise recommendations are backed by this research and should maintain scientific accuracy.

## File Encoding and Language

- All content is in Korean (UTF-8 encoding)
- HTML files use proper Korean language meta tags
- File names use Korean characters - handle with proper encoding

## Quality Assurance

When modifying files:
- Verify all YouTube links are functional
- Maintain responsive design across devices
- Ensure exercise safety notes are preserved
- Keep medical accuracy of exercise descriptions
- Test checklist functionality in HTML files

## Git Workflow

- Main branch contains stable exercise plans
- Commit messages should be descriptive of changes made
- Always verify HTML files display properly before committing