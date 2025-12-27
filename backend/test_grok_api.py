#!/usr/bin/env python3
"""
Test script to verify Grok API connection
"""
import asyncio
import sys

import pytest

from config import settings
from services.ai_service import ai_service
from models.schemas import ChatMessage, AIProvider


async def _run_grok_api():
    """Run the Grok API connectivity check."""

    print("🧪 Testing Grok API Connection")
    print("=" * 50)
    print()
    
    # Check if API key is configured
    if not settings.xai_api_key or settings.xai_api_key == "your_xai_api_key_here":
        print("❌ Error: XAI_API_KEY is not configured")
        print("Please set your Grok API key in backend/.env")
        return False
    
    print(f"✅ API Key configured: {settings.xai_api_key[:10]}...")
    print()
    
    # Create a simple test message
    test_messages = [
        ChatMessage(
            role="user",
            content="Hello! Please respond with a simple greeting to confirm you're working."
        )
    ]
    
    print("📤 Sending test message to Grok...")
    print(f"Message: {test_messages[0].content}")
    print()
    
    try:
        # Call Grok API
        response = await ai_service.generate_response(
            messages=test_messages,
            provider=AIProvider.GROK,
            system_prompt="You are a helpful AI assistant. Respond briefly and clearly.",
            max_tokens=100
        )
        
        print("✅ SUCCESS! Grok API is working!")
        print()
        print("📥 Response from Grok:")
        print("-" * 50)
        print(response)
        print("-" * 50)
        print()
        
        return True
        
    except Exception as e:
        print("❌ ERROR: Failed to connect to Grok API")
        print()
        print(f"Error details: {str(e)}")
        print()
        print("Common issues:")
        print("1. Invalid API key")
        print("2. Network connectivity issues")
        print("3. API endpoint not accessible")
        print()
        return False


async def _run_code_generation():
    """Run Grok code-generation check."""

    print()
    print("🧪 Testing Code Generation with Grok")
    print("=" * 50)
    print()
    
    try:
        result = await ai_service.generate_code(
            prompt="Create a simple Python function that adds two numbers",
            tech_stack="python",
            provider=AIProvider.GROK,
            context=None
        )
        
        print("✅ Code generation successful!")
        print()
        print(f"📄 Filename: {result.get('filename', 'N/A')}")
        print(f"📦 Dependencies: {', '.join(result.get('dependencies', [])) or 'None'}")
        print()
        print("💻 Generated Code:")
        print("-" * 50)
        print(result.get('code', 'No code generated'))
        print("-" * 50)
        print()
        
        if result.get('explanation'):
            print("📝 Explanation:")
            print(result['explanation'])
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Code generation failed: {str(e)}")
        return False


def test_grok_api():
    """Pytest entrypoint that runs the async Grok connectivity check."""
    if not settings.xai_api_key or settings.xai_api_key == "your_xai_api_key_here":
        pytest.skip("XAI_API_KEY not configured; skipping live Grok test.")
    assert asyncio.run(_run_grok_api())


def test_code_generation():
    """Pytest entrypoint that runs the async code generation check."""
    if not settings.xai_api_key or settings.xai_api_key == "your_xai_api_key_here":
        pytest.skip("XAI_API_KEY not configured; skipping live Grok code generation test.")
    assert asyncio.run(_run_code_generation())


async def main():
    """Run all tests manually."""
    print()
    print("🚀 Intelekt - Grok API Test Suite")
    print("=" * 50)
    print()
    
    # Test 1: Basic API connection
    test1_passed = await _run_grok_api()
    
    if test1_passed:
        # Test 2: Code generation
        test2_passed = await _run_code_generation()
        
        print()
        print("=" * 50)
        print("📊 Test Results Summary")
        print("=" * 50)
        print(f"✅ API Connection: {'PASSED' if test1_passed else 'FAILED'}")
        print(f"✅ Code Generation: {'PASSED' if test2_passed else 'FAILED'}")
        print()
        
        if test1_passed and test2_passed:
            print("🎉 All tests passed! Grok API is fully functional.")
            return 0
        else:
            print("⚠️  Some tests failed. Please check the errors above.")
            return 1
    else:
        print()
        print("❌ Basic API connection failed. Skipping code generation test.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
