from anthropic import AsyncAnthropic
import httpx
from typing import List, Dict, Optional, AsyncGenerator
from models.schemas import AIProvider, ChatMessage
from config import settings
import json


class AIService:
    """Service for interacting with AI providers (Claude and Grok)."""
    
    def __init__(self):
        """Initialize AI service with API clients."""
        self.anthropic_client = None
        self.xai_base_url = "https://api.x.ai/v1"
        
        if settings.anthropic_api_key:
            self.anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    
    async def generate_response(
        self,
        messages: List[ChatMessage],
        provider: AIProvider,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096
    ) -> str:
        """Generate AI response based on conversation history."""
        
        if provider == AIProvider.CLAUDE:
            return await self._generate_claude_response(messages, system_prompt, max_tokens)
        elif provider == AIProvider.GROK:
            return await self._generate_grok_response(messages, system_prompt, max_tokens)
        else:
            raise ValueError(f"Unsupported AI provider: {provider}")
    
    async def _generate_claude_response(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str],
        max_tokens: int
    ) -> str:
        """Generate response using Claude API."""
        if not self.anthropic_client:
            raise ValueError("Anthropic API key not configured")
        
        # Convert messages to Claude format
        claude_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
            if msg.role in ["user", "assistant"]
        ]
        
        # Create system prompt
        system = system_prompt or self._get_default_system_prompt()
        
        # Call Claude API (now properly async)
        response = await self.anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            system=system,
            messages=claude_messages
        )
        
        return response.content[0].text
    
    async def stream_claude_response(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096
    ) -> AsyncGenerator[str, None]:
        """Stream response from Claude API."""
        if not self.anthropic_client:
            raise ValueError("Anthropic API key not configured")
        
        claude_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
            if msg.role in ["user", "assistant"]
        ]
        
        system = system_prompt or self._get_default_system_prompt()
        
        async with self.anthropic_client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            system=system,
            messages=claude_messages
        ) as stream:
            async for text in stream.text_stream:
                yield text
    
    async def _generate_grok_response(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str],
        max_tokens: int
    ) -> str:
        """Generate response using Grok API."""
        if not settings.xai_api_key:
            raise ValueError("xAI API key not configured")
        
        # Convert messages to Grok format
        grok_messages = []
        
        # Add system message
        grok_messages.append({
            "role": "system",
            "content": system_prompt or self._get_default_system_prompt()
        })
        
        # Add conversation messages
        for msg in messages:
            if msg.role in ["user", "assistant"]:
                grok_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        # Call Grok API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.xai_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.xai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "grok-3",
                    "messages": grok_messages,
                    "max_tokens": max_tokens,
                    "temperature": 0.7
                },
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
            
            return data["choices"][0]["message"]["content"]
    
    async def stream_grok_response(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096
    ) -> AsyncGenerator[str, None]:
        """Stream response from Grok API."""
        if not settings.xai_api_key:
            raise ValueError("xAI API key not configured")
        
        grok_messages = []
        grok_messages.append({
            "role": "system",
            "content": system_prompt or self._get_default_system_prompt()
        })
        
        for msg in messages:
            if msg.role in ["user", "assistant"]:
                grok_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.xai_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.xai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "grok-3",
                    "messages": grok_messages,
                    "max_tokens": max_tokens,
                    "temperature": 0.7,
                    "stream": True
                },
                timeout=120.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            if chunk["choices"][0]["delta"].get("content"):
                                yield chunk["choices"][0]["delta"]["content"]
                        except json.JSONDecodeError:
                            continue
    
    async def stream_response(
        self,
        messages: List[ChatMessage],
        provider: AIProvider,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096
    ) -> AsyncGenerator[str, None]:
        """Stream AI response based on provider."""
        if provider == AIProvider.CLAUDE:
            async for chunk in self.stream_claude_response(messages, system_prompt, max_tokens):
                yield chunk
        elif provider == AIProvider.GROK:
            async for chunk in self.stream_grok_response(messages, system_prompt, max_tokens):
                yield chunk
        else:
            raise ValueError(f"Unsupported AI provider: {provider}")
    
    def _get_default_system_prompt(self) -> str:
        """Get default system prompt for code generation."""
        return """You are Intelekt, an expert AI web application builder. Your role is to help users create complete, production-ready web applications through conversational interactions.

Key capabilities:
1. Generate code in Mojo (priority 1), Python (priority 2), or JavaScript (priority 3)
2. Create full-stack web applications with proper architecture
3. Provide clear explanations and best practices
4. Suggest improvements and optimizations
5. Handle database integration with ChromaDB

When generating code:
- Always provide complete, runnable code
- Include necessary imports and dependencies
- Follow best practices and modern patterns
- Add helpful comments
- Consider security and performance
- Structure code properly with clear separation of concerns

When responding:
- Be clear and concise
- Ask clarifying questions when needed
- Provide code snippets with explanations
- Suggest next steps
- Validate user requirements

Tech stack priorities for generated apps:
1. Mojo language and frameworks (when mature/available)
2. Python frameworks (Flask, FastAPI, Django)
3. JavaScript frameworks (React, Next.js, Vue, Express)

Always use ChromaDB for database needs unless specifically requested otherwise."""
    
    async def generate_code(
        self,
        prompt: str,
        tech_stack: str,
        provider: AIProvider,
        context: Optional[str] = None
    ) -> Dict[str, str]:
        """Generate code based on prompt and tech stack."""
        
        # Build code generation prompt
        code_prompt = f"""Generate production-ready code for the following requirement:

Requirement: {prompt}

Tech Stack: {tech_stack}

{f"Additional Context: {context}" if context else ""}

Please provide:
1. Complete, runnable code
2. File name/path suggestion
3. Required dependencies
4. Brief explanation of the code

Format your response as:
FILENAME: <suggested filename>
DEPENDENCIES: <comma-separated list>
CODE:
<your code here>
EXPLANATION:
<brief explanation>
"""
        
        messages = [ChatMessage(role="user", content=code_prompt)]
        response = await self.generate_response(messages, provider)
        
        # Parse response
        return self._parse_code_response(response)
    
    def _parse_code_response(self, response: str) -> Dict[str, str]:
        """Parse AI response to extract code components."""
        result = {
            "filename": "generated_code.txt",
            "dependencies": [],
            "code": "",
            "explanation": ""
        }
        
        lines = response.split("\n")
        current_section = None
        code_lines = []
        explanation_lines = []
        
        for line in lines:
            if line.startswith("FILENAME:"):
                result["filename"] = line.replace("FILENAME:", "").strip()
            elif line.startswith("DEPENDENCIES:"):
                deps = line.replace("DEPENDENCIES:", "").strip()
                result["dependencies"] = [d.strip() for d in deps.split(",") if d.strip()]
            elif line.startswith("CODE:"):
                current_section = "code"
            elif line.startswith("EXPLANATION:"):
                current_section = "explanation"
            elif current_section == "code":
                code_lines.append(line)
            elif current_section == "explanation":
                explanation_lines.append(line)
        
        result["code"] = "\n".join(code_lines).strip()
        result["explanation"] = "\n".join(explanation_lines).strip()
        
        # If parsing failed, use entire response as code
        if not result["code"]:
            result["code"] = response
        
        return result

    async def generate_project_files(
        self,
        prompt: str,
        tech_stack: str,
        provider: AIProvider,
        context: Optional[str] = None
    ) -> Dict:
        """Generate multiple files for a complete project."""
        
        # Build multi-file generation prompt
        project_prompt = f"""Generate a complete project with multiple files for the following requirement:

Requirement: {prompt}

Tech Stack: {tech_stack}

{f"Additional Context: {context}" if context else ""}

Generate ALL necessary files for a complete, working project. For web apps, include HTML, CSS, and JavaScript files.

IMPORTANT: Format your response EXACTLY as follows, with each file clearly marked:

===FILE: <filepath>===
<complete file content>
===END_FILE===

===FILE: <filepath>===
<complete file content>
===END_FILE===

DEPENDENCIES:
<list of npm/pip packages needed, one per line>

EXPLANATION:
<brief explanation of the project structure>

Example format:
===FILE: index.html===
<!DOCTYPE html>
<html>...</html>
===END_FILE===

===FILE: style.css===
body {{ margin: 0; }}
===END_FILE===

===FILE: app.js===
console.log('Hello');
===END_FILE===

Generate complete, production-ready code for each file. Include:
- index.html (main HTML file)
- style.css or styles.css (styling)
- app.js, script.js, or main.js (JavaScript logic)
- Any additional files needed for the project

Start generating the files now:
"""
        
        messages = [ChatMessage(role="user", content=project_prompt)]
        response = await self.generate_response(messages, provider, max_tokens=8192)
        
        # Parse multi-file response
        return self._parse_multi_file_response(response)
    
    def _parse_multi_file_response(self, response: str) -> Dict:
        """Parse AI response to extract multiple files."""
        import re
        
        result = {
            "files": [],
            "dependencies": [],
            "explanation": ""
        }
        
        # Extract files using regex pattern
        file_pattern = r'===FILE:\s*([^=]+)===\s*([\s\S]*?)===END_FILE==='
        matches = re.findall(file_pattern, response)
        
        for filepath, content in matches:
            filepath = filepath.strip()
            content = content.strip()
            
            # Remove markdown code blocks if present
            if content.startswith('```'):
                lines = content.split('\n')
                # Remove first line (```language)
                lines = lines[1:]
                # Remove last line if it's ```
                if lines and lines[-1].strip() == '```':
                    lines = lines[:-1]
                content = '\n'.join(lines)
            
            if filepath and content:
                result["files"].append({
                    "path": filepath,
                    "content": content
                })
        
        # Extract dependencies
        deps_match = re.search(r'DEPENDENCIES:\s*([\s\S]*?)(?:EXPLANATION:|$)', response)
        if deps_match:
            deps_text = deps_match.group(1).strip()
            deps = [d.strip() for d in deps_text.split('\n') if d.strip() and not d.startswith('-')]
            # Also handle dash-prefixed items
            deps += [d.strip().lstrip('-').strip() for d in deps_text.split('\n') if d.strip().startswith('-')]
            result["dependencies"] = [d for d in deps if d]
        
        # Extract explanation
        explanation_match = re.search(r'EXPLANATION:\s*([\s\S]*?)$', response)
        if explanation_match:
            result["explanation"] = explanation_match.group(1).strip()
        
        # Fallback: try to extract code blocks if no files were found
        if not result["files"]:
            result["files"] = self._extract_code_blocks_as_files(response)
        
        return result
    
    def _extract_code_blocks_as_files(self, response: str) -> List[Dict[str, str]]:
        """Extract code blocks and infer filenames from language hints."""
        import re
        
        files = []
        
        # Match markdown code blocks with language
        code_block_pattern = r'```(\w+)?\s*\n([\s\S]*?)```'
        matches = re.findall(code_block_pattern, response)
        
        extension_map = {
            'html': 'index.html',
            'css': 'style.css',
            'javascript': 'app.js',
            'js': 'app.js',
            'python': 'main.py',
            'py': 'main.py',
            'json': 'package.json',
            'typescript': 'app.ts',
            'ts': 'app.ts',
            'jsx': 'App.jsx',
            'tsx': 'App.tsx',
        }
        
        used_names = set()
        
        for lang, content in matches:
            lang = (lang or 'txt').lower()
            base_name = extension_map.get(lang, f'file.{lang}')
            
            # Ensure unique names
            filename = base_name
            counter = 1
            while filename in used_names:
                name, ext = base_name.rsplit('.', 1)
                filename = f"{name}_{counter}.{ext}"
                counter += 1
            
            used_names.add(filename)
            
            if content.strip():
                files.append({
                    "path": filename,
                    "content": content.strip()
                })
        
        return files

    async def refine_code(
        self,
        instruction: str,
        existing_files: Dict[str, str],
        provider: AIProvider,
        conversation_context: Optional[str] = None
    ) -> Dict:
        """
        Refine existing code based on a natural language instruction.
        
        This method enables iterative refinement where users can say things like:
        - "Make the header blue"
        - "Add a footer with social links"
        - "Fix the button alignment"
        - "Make the fonts bigger"
        
        Args:
            instruction: The refinement instruction from the user
            existing_files: Dict mapping file paths to their current content
            provider: AI provider to use
            conversation_context: Previous conversation for context
            
        Returns:
            Dict with modified files and explanation
        """
        
        # Build the context with existing files
        files_context = "\n\n".join([
            f"===CURRENT FILE: {path}===\n{content}\n===END FILE==="
            for path, content in existing_files.items()
        ])
        
        refinement_prompt = f"""You are refining an existing project based on user feedback.

CURRENT PROJECT FILES:
{files_context}

{f"PREVIOUS CONVERSATION CONTEXT:{chr(10)}{conversation_context}{chr(10)}" if conversation_context else ""}

USER'S REFINEMENT REQUEST:
{instruction}

IMPORTANT INSTRUCTIONS:
1. Analyze the request and determine which file(s) need to be modified
2. Make ONLY the changes necessary to fulfill the request
3. Preserve all existing functionality and code that doesn't need to change
4. Keep the same file structure unless the request specifically asks to add/remove files

FORMAT YOUR RESPONSE EXACTLY AS:

===CHANGES_SUMMARY===
<Brief explanation of what you changed and why>
===END_SUMMARY===

===MODIFIED_FILE: <filepath>===
<complete updated file content>
===END_FILE===

(Repeat for each file that needs changes. Only include files that were modified.)

If NO changes are needed, respond with:
===NO_CHANGES===
<explanation of why no changes are needed>
===END===
"""
        
        messages = [ChatMessage(role="user", content=refinement_prompt)]
        response = await self.generate_response(messages, provider, max_tokens=8192)
        
        return self._parse_refinement_response(response, existing_files)
    
    def _parse_refinement_response(
        self, 
        response: str, 
        existing_files: Dict[str, str]
    ) -> Dict:
        """Parse refinement response to extract modified files."""
        result = {
            "summary": "",
            "modified_files": [],
            "no_changes": False,
            "explanation": ""
        }
        
        # Check for no changes response
        if "===NO_CHANGES===" in response:
            result["no_changes"] = True
            match = re.search(r'===NO_CHANGES===\s*(.*?)\s*===END===', response, re.DOTALL)
            if match:
                result["explanation"] = match.group(1).strip()
            return result
        
        # Extract summary
        summary_match = re.search(r'===CHANGES_SUMMARY===\s*(.*?)\s*===END_SUMMARY===', response, re.DOTALL)
        if summary_match:
            result["summary"] = summary_match.group(1).strip()
        
        # Extract modified files
        file_pattern = r'===MODIFIED_FILE:\s*([^\n=]+)===\s*(.*?)\s*===END_FILE==='
        matches = re.findall(file_pattern, response, re.DOTALL)
        
        for filepath, content in matches:
            filepath = filepath.strip()
            content = content.strip()
            
            # Track if this is actually a modification
            is_new = filepath not in existing_files
            
            result["modified_files"].append({
                "path": filepath,
                "content": content,
                "is_new": is_new
            })
        
        # If no files were parsed but response contains code, try fallback parsing
        if not result["modified_files"] and "```" in response:
            result["modified_files"] = self._fallback_refinement_parse(response, existing_files)
            if not result["summary"]:
                result["summary"] = "Applied requested changes."
        
        return result
    
    def _fallback_refinement_parse(
        self, 
        response: str, 
        existing_files: Dict[str, str]
    ) -> List[Dict]:
        """Fallback parser when structured format isn't followed."""
        files = []
        
        # Try to match code blocks with filenames in comments or nearby text
        code_pattern = r'```(\w+)?\s*\n(.*?)```'
        matches = re.findall(code_pattern, response, re.DOTALL)
        
        if not matches:
            return files
        
        # Map languages to likely files from existing project
        lang_to_existing = {}
        for path in existing_files.keys():
            ext = path.rsplit('.', 1)[-1].lower()
            lang_map = {
                'html': ['html'],
                'css': ['css', 'scss', 'sass'],
                'js': ['javascript', 'js'],
                'ts': ['typescript', 'ts'],
                'py': ['python', 'py'],
                'json': ['json'],
            }
            for lang, aliases in lang_map.items():
                if ext == lang:
                    for alias in aliases:
                        lang_to_existing[alias] = path
        
        for lang, content in matches:
            lang = (lang or '').lower()
            
            # Try to find matching existing file
            if lang in lang_to_existing:
                files.append({
                    "path": lang_to_existing[lang],
                    "content": content.strip(),
                    "is_new": False
                })
            elif content.strip():
                # Create new file based on language
                ext_map = {'javascript': 'js', 'typescript': 'ts', 'python': 'py'}
                ext = ext_map.get(lang, lang) if lang else 'txt'
                files.append({
                    "path": f"modified.{ext}",
                    "content": content.strip(),
                    "is_new": True
                })
        
        return files

    def is_refinement_request(self, message: str, has_existing_files: bool) -> bool:
        """
        Detect if a message is a refinement request vs. a new generation request.
        
        Refinement requests typically:
        - Reference existing elements ("the header", "that button", "the footer")
        - Use modification verbs ("change", "fix", "update", "make", "adjust")
        - Are short and conversational
        """
        if not has_existing_files:
            return False
        
        message_lower = message.lower()
        
        # Keywords that suggest refinement
        refinement_verbs = [
            'change', 'fix', 'update', 'make', 'adjust', 'modify', 
            'tweak', 'improve', 'align', 'center', 'move', 'resize',
            'recolor', 'restyle', 'add padding', 'add margin', 'remove',
            'hide', 'show', 'increase', 'decrease', 'bigger', 'smaller'
        ]
        
        # References to existing elements
        element_references = [
            'the header', 'the footer', 'the button', 'the nav', 
            'the sidebar', 'the menu', 'the form', 'the input',
            'the title', 'the text', 'the image', 'the logo',
            'the card', 'the container', 'the section', 'the div',
            'that', 'this', 'it'
        ]
        
        # Color and style changes
        style_keywords = [
            'blue', 'red', 'green', 'black', 'white', 'dark', 'light',
            'bold', 'italic', 'larger', 'smaller', 'centered', 'left',
            'right', 'top', 'bottom', 'rounded', 'shadow', 'border'
        ]
        
        # Check for refinement patterns
        has_refinement_verb = any(verb in message_lower for verb in refinement_verbs)
        has_element_ref = any(ref in message_lower for ref in element_references)
        has_style_keyword = any(kw in message_lower for kw in style_keywords)
        
        # Short messages with style keywords are likely refinements
        is_short = len(message.split()) < 15
        
        return (has_refinement_verb and (has_element_ref or has_style_keyword)) or \
               (is_short and has_style_keyword and has_element_ref)


# Singleton instance
ai_service = AIService()
