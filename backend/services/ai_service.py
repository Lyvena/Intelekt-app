from anthropic import Anthropic
import httpx
from typing import List, Dict, Optional
from models.schemas import AIProvider, ChatMessage
from config import settings


class AIService:
    """Service for interacting with AI providers (Claude and Grok)."""
    
    def __init__(self):
        """Initialize AI service with API clients."""
        self.anthropic_client = None
        self.xai_base_url = "https://api.x.ai/v1"
        
        if settings.anthropic_api_key:
            self.anthropic_client = Anthropic(api_key=settings.anthropic_api_key)
    
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
        
        # Call Claude API
        response = self.anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=max_tokens,
            system=system,
            messages=claude_messages
        )
        
        return response.content[0].text
    
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
        
        # Add system message if provided
        if system_prompt:
            grok_messages.append({
                "role": "system",
                "content": system_prompt or self._get_default_system_prompt()
            })
        
        # Add conversation messages
        for msg in messages:
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
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            
            return data["choices"][0]["message"]["content"]
    
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


# Singleton instance
ai_service = AIService()
