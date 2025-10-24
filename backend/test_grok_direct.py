#!/usr/bin/env python3
"""
Direct test of Grok API to diagnose connection issues
"""
import asyncio
import httpx
from config import settings

async def test_grok_direct():
    """Test Grok API with direct HTTP request"""
    
    print("🧪 Direct Grok API Test")
    print("=" * 50)
    print()
    
    api_key = settings.xai_api_key
    
    if not api_key or api_key == "your_xai_api_key_here":
        print("❌ Error: XAI_API_KEY not configured")
        return
    
    print(f"✅ API Key: {api_key[:15]}...")
    print()
    
    # Try different potential endpoints
    endpoints = [
        "https://api.x.ai/v1/chat/completions",
        "https://api.x.ai/chat/completions",
        "https://api.x.ai/v1/completions",
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "grok-beta",
        "messages": [
            {"role": "user", "content": "Hello, respond with 'API Working'"}
        ],
        "max_tokens": 50
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for endpoint in endpoints:
            print(f"🔍 Testing endpoint: {endpoint}")
            try:
                response = await client.post(
                    endpoint,
                    headers=headers,
                    json=payload
                )
                
                print(f"   Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    print("   ✅ SUCCESS!")
                    data = response.json()
                    print(f"   Response: {data}")
                    return True
                else:
                    print(f"   ❌ Failed: {response.text[:200]}")
                    
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
            
            print()
    
    print("=" * 50)
    print("⚠️  All endpoints failed")
    print()
    print("Possible issues:")
    print("1. The Grok API might not be publicly available yet")
    print("2. The API key format might be incorrect")
    print("3. The endpoint URL might have changed")
    print("4. The API might require different authentication")
    print()
    print("Recommendation:")
    print("- Check xAI documentation: https://x.ai/")
    print("- Verify your API key is valid and active")
    print("- Contact xAI support if the issue persists")
    
    return False

if __name__ == "__main__":
    asyncio.run(test_grok_direct())
