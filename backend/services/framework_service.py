"""
MIT 24-Step Disciplined Entrepreneurship Framework Service

This service guides users through the structured process of developing
their startup idea before any code is generated. It ensures ideas are
properly analyzed, validated, and refined.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import json


class FrameworkPhase(str, Enum):
    """Main phases of the framework."""
    CUSTOMER = "customer"           # Steps 1-5: Who is your customer?
    VALUE = "value"                 # Steps 6-9: What can you do for them?
    ACQUISITION = "acquisition"     # Steps 10-14: How do they acquire your product?
    MONETIZATION = "monetization"   # Steps 15-17: How do you make money?
    BUILDING = "building"           # Steps 18-20: How do you design & build?
    SCALING = "scaling"             # Steps 21-24: How do you scale?
    DEVELOPMENT = "development"     # Code generation phase


class StepStatus(str, Enum):
    """Status of each step."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


@dataclass
class FrameworkStep:
    """Represents a single step in the framework."""
    number: int
    name: str
    phase: FrameworkPhase
    description: str
    key_questions: List[str]
    deliverables: List[str]
    status: StepStatus = StepStatus.NOT_STARTED
    user_responses: Dict[str, Any] = field(default_factory=dict)
    ai_analysis: Optional[str] = None
    completed_at: Optional[datetime] = None


# Define all 24 steps of the MIT Disciplined Entrepreneurship framework
MIT_24_STEPS: List[Dict] = [
    # Phase 1: WHO IS YOUR CUSTOMER? (Steps 1-5)
    {
        "number": 1,
        "name": "Market Segmentation",
        "phase": FrameworkPhase.CUSTOMER,
        "description": "Brainstorm potential customer segments and industries that might benefit from your idea.",
        "key_questions": [
            "What problem are you trying to solve?",
            "Who experiences this problem most acutely?",
            "What industries or sectors face this challenge?",
            "Can you identify 5-10 different potential customer segments?"
        ],
        "deliverables": ["List of potential market segments", "Initial problem statement"]
    },
    {
        "number": 2,
        "name": "Select Beachhead Market",
        "phase": FrameworkPhase.CUSTOMER,
        "description": "Choose one specific market segment to focus on first - your beachhead market.",
        "key_questions": [
            "Which segment has the most urgent need?",
            "Which segment can you reach most easily?",
            "Which segment can afford to pay?",
            "Which segment will help you expand to others?"
        ],
        "deliverables": ["Selected beachhead market", "Justification for selection"]
    },
    {
        "number": 3,
        "name": "Build End User Profile",
        "phase": FrameworkPhase.CUSTOMER,
        "description": "Create a detailed profile of the end user within your beachhead market.",
        "key_questions": [
            "What is their job title or role?",
            "What are their demographics?",
            "What are their daily pain points?",
            "What motivates them?",
            "Where do they get information?"
        ],
        "deliverables": ["Detailed end user profile", "User characteristics matrix"]
    },
    {
        "number": 4,
        "name": "Calculate TAM for Beachhead",
        "phase": FrameworkPhase.CUSTOMER,
        "description": "Estimate the Total Addressable Market size for your beachhead.",
        "key_questions": [
            "How many potential customers exist in this segment?",
            "What is the annual budget/spend for solving this problem?",
            "What is the realistic market size you can capture?",
            "How will the market grow over time?"
        ],
        "deliverables": ["TAM calculation", "Market size estimate", "Growth projections"]
    },
    {
        "number": 5,
        "name": "Profile the Persona",
        "phase": FrameworkPhase.CUSTOMER,
        "description": "Create a vivid, specific persona representing your ideal customer.",
        "key_questions": [
            "What is their name, age, background?",
            "What does a typical day look like for them?",
            "What are their goals and frustrations?",
            "What would make them say 'I need this!'?",
            "What are their buying habits?"
        ],
        "deliverables": ["Detailed persona document", "User story narrative"]
    },
    
    # Phase 2: WHAT CAN YOU DO FOR YOUR CUSTOMER? (Steps 6-9)
    {
        "number": 6,
        "name": "Full Life Cycle Use Case",
        "phase": FrameworkPhase.VALUE,
        "description": "Map how your product fits into the customer's life from discovery to ongoing use.",
        "key_questions": [
            "How does the customer discover they have the problem?",
            "How do they find your solution?",
            "What is their first experience with your product?",
            "How do they use it day-to-day?",
            "What makes them continue using it?"
        ],
        "deliverables": ["Customer journey map", "Use case documentation"]
    },
    {
        "number": 7,
        "name": "High-Level Product Specification",
        "phase": FrameworkPhase.VALUE,
        "description": "Define the core product features and capabilities needed.",
        "key_questions": [
            "What are the must-have features?",
            "What are the nice-to-have features?",
            "What features should be explicitly excluded?",
            "What is the minimum viable product (MVP)?",
            "How will the product evolve over time?"
        ],
        "deliverables": ["Product specification document", "MVP feature list", "Product roadmap"]
    },
    {
        "number": 8,
        "name": "Quantify Value Proposition",
        "phase": FrameworkPhase.VALUE,
        "description": "Calculate the specific, measurable value your product delivers.",
        "key_questions": [
            "How much time does your product save?",
            "How much money does it save or generate?",
            "What is the ROI for the customer?",
            "How does this compare to alternatives?",
            "Can you quantify the improvement?"
        ],
        "deliverables": ["Quantified value proposition", "ROI calculation", "Comparison matrix"]
    },
    {
        "number": 9,
        "name": "Identify Next 10 Customers",
        "phase": FrameworkPhase.VALUE,
        "description": "List specific potential customers you could acquire after proving the concept.",
        "key_questions": [
            "Who are 10 specific people/companies you could sell to?",
            "How would you reach each of them?",
            "What would convince them to buy?",
            "Are they connected to each other?",
            "Can they provide referrals?"
        ],
        "deliverables": ["List of 10 target customers", "Acquisition strategy for each"]
    },
    
    # Phase 3: HOW DO THEY ACQUIRE YOUR PRODUCT? (Steps 10-14)
    {
        "number": 10,
        "name": "Define Your Core",
        "phase": FrameworkPhase.ACQUISITION,
        "description": "Identify your unique competitive advantage that's hard to copy.",
        "key_questions": [
            "What can you do better than anyone else?",
            "What is your unfair advantage?",
            "What would be hardest for competitors to replicate?",
            "Is it technology, network effects, brand, or expertise?",
            "How sustainable is this advantage?"
        ],
        "deliverables": ["Core competency statement", "Competitive moat analysis"]
    },
    {
        "number": 11,
        "name": "Chart Competitive Position",
        "phase": FrameworkPhase.ACQUISITION,
        "description": "Map your position relative to competitors on key dimensions.",
        "key_questions": [
            "Who are your direct competitors?",
            "Who are your indirect competitors?",
            "What are the key buying criteria?",
            "Where do you win vs. competitors?",
            "What is your positioning statement?"
        ],
        "deliverables": ["Competitive landscape map", "Positioning matrix"]
    },
    {
        "number": 12,
        "name": "Determine Decision Making Unit",
        "phase": FrameworkPhase.ACQUISITION,
        "description": "Identify all people involved in the purchase decision.",
        "key_questions": [
            "Who is the end user?",
            "Who is the economic buyer?",
            "Who are the influencers?",
            "Who can veto the purchase?",
            "Who is the champion inside the organization?"
        ],
        "deliverables": ["DMU diagram", "Stakeholder analysis"]
    },
    {
        "number": 13,
        "name": "Map Customer Acquisition Process",
        "phase": FrameworkPhase.ACQUISITION,
        "description": "Document the steps to acquire a customer from awareness to purchase.",
        "key_questions": [
            "How will customers become aware of you?",
            "What triggers consideration?",
            "What information do they need to decide?",
            "What is the typical sales cycle length?",
            "What are the key conversion points?"
        ],
        "deliverables": ["Acquisition funnel", "Sales process documentation"]
    },
    {
        "number": 14,
        "name": "Calculate TAM for Follow-on Markets",
        "phase": FrameworkPhase.ACQUISITION,
        "description": "Identify and size the markets you'll expand into after the beachhead.",
        "key_questions": [
            "What adjacent markets can you enter?",
            "How will success in beachhead enable expansion?",
            "What is the total market opportunity across segments?",
            "What is the expansion timeline?",
            "What new capabilities will you need?"
        ],
        "deliverables": ["Follow-on market analysis", "Expansion roadmap"]
    },
    
    # Phase 4: HOW DO YOU MAKE MONEY? (Steps 15-17)
    {
        "number": 15,
        "name": "Design Business Model",
        "phase": FrameworkPhase.MONETIZATION,
        "description": "Determine how you will capture value and generate revenue.",
        "key_questions": [
            "What pricing model makes sense? (subscription, one-time, usage-based)",
            "Who pays - the user or someone else?",
            "What are the cost drivers?",
            "What are the revenue streams?",
            "How does the model scale?"
        ],
        "deliverables": ["Business model canvas", "Revenue model documentation"]
    },
    {
        "number": 16,
        "name": "Set Pricing Framework",
        "phase": FrameworkPhase.MONETIZATION,
        "description": "Determine the specific pricing for your product.",
        "key_questions": [
            "What is the value-based price?",
            "What are competitors charging?",
            "What is the customer's willingness to pay?",
            "What pricing tiers make sense?",
            "How will pricing evolve over time?"
        ],
        "deliverables": ["Pricing strategy", "Price point recommendations"]
    },
    {
        "number": 17,
        "name": "Calculate LTV",
        "phase": FrameworkPhase.MONETIZATION,
        "description": "Estimate the Lifetime Value of a customer.",
        "key_questions": [
            "What is the average revenue per customer?",
            "What is the expected customer lifespan?",
            "What is the gross margin?",
            "What is the churn rate?",
            "How does LTV compare to CAC?"
        ],
        "deliverables": ["LTV calculation", "Unit economics model"]
    },
    
    # Phase 5: HOW DO YOU DESIGN & BUILD? (Steps 18-20)
    {
        "number": 18,
        "name": "Map Sales Process",
        "phase": FrameworkPhase.BUILDING,
        "description": "Design the end-to-end process for selling your product.",
        "key_questions": [
            "What is the lead generation strategy?",
            "What is the sales cycle?",
            "What tools and resources are needed?",
            "What is the conversion rate at each stage?",
            "What is the average deal size?"
        ],
        "deliverables": ["Sales process map", "Sales playbook outline"]
    },
    {
        "number": 19,
        "name": "Calculate COCA",
        "phase": FrameworkPhase.BUILDING,
        "description": "Determine the Cost of Customer Acquisition.",
        "key_questions": [
            "What are all customer acquisition costs?",
            "What is the cost per channel?",
            "How does COCA change at scale?",
            "What is the target COCA?",
            "How does COCA compare to LTV?"
        ],
        "deliverables": ["COCA calculation", "Channel cost analysis"]
    },
    {
        "number": 20,
        "name": "Identify Key Assumptions",
        "phase": FrameworkPhase.BUILDING,
        "description": "List and prioritize the assumptions that must be true for success.",
        "key_questions": [
            "What are your leap of faith assumptions?",
            "Which assumptions are highest risk?",
            "How can you test each assumption?",
            "What would invalidate your hypothesis?",
            "What pivot options exist?"
        ],
        "deliverables": ["Assumptions list", "Risk matrix", "Testing plan"]
    },
    
    # Phase 6: HOW DO YOU SCALE? (Steps 21-24)
    {
        "number": 21,
        "name": "Design MVP Test",
        "phase": FrameworkPhase.SCALING,
        "description": "Design the Minimum Viable Product to test critical assumptions.",
        "key_questions": [
            "What is the smallest product to test the value hypothesis?",
            "What features are essential vs. optional?",
            "How will you measure success?",
            "What is the timeline and budget?",
            "Who will be the test users?"
        ],
        "deliverables": ["MVP specification", "Test plan", "Success metrics"]
    },
    {
        "number": 22,
        "name": "Test MVP Assumptions",
        "phase": FrameworkPhase.SCALING,
        "description": "Run tests to validate or invalidate your assumptions.",
        "key_questions": [
            "What tests will you run?",
            "What data will you collect?",
            "How will you interpret results?",
            "When will you pivot vs. persevere?",
            "What is the iteration plan?"
        ],
        "deliverables": ["Test results", "Validated/invalidated assumptions"]
    },
    {
        "number": 23,
        "name": "Define MVBP",
        "phase": FrameworkPhase.SCALING,
        "description": "Design the Minimum Viable Business Product for paying customers.",
        "key_questions": [
            "What is needed for customers to pay?",
            "What is the launch feature set?",
            "What is the pricing for MVBP?",
            "What is the go-to-market plan?",
            "What support is needed?"
        ],
        "deliverables": ["MVBP specification", "Launch plan"]
    },
    {
        "number": 24,
        "name": "Develop Product Plan",
        "phase": FrameworkPhase.SCALING,
        "description": "Create the roadmap for building and launching the product.",
        "key_questions": [
            "What is the development timeline?",
            "What are the milestones?",
            "What resources are needed?",
            "What is the tech stack?",
            "What are the key risks and mitigations?"
        ],
        "deliverables": ["Product roadmap", "Development plan", "Resource plan"]
    }
]


class FrameworkService:
    """Service for managing the MIT 24-Step framework analysis."""
    
    def __init__(self):
        self.sessions: Dict[str, Dict] = {}  # project_id -> framework state
        # Lightweight sample content to prefill the framework for demo purposes
        self.sample_responses: Dict[int, Dict[str, Any]] = {
            1: {"ai_analysis": "Targeting indie developers needing faster MVP launches.", "user_responses": {"segments": "Indie devs, small agencies, early founders"}},
            2: {"ai_analysis": "Beachhead: solo/indie developers building client MVPs.", "user_responses": {"beachhead": "Indie developers with 2-5 active clients"}},
            3: {"ai_analysis": "Persona: Alex, 28, freelance developer shipping MVPs monthly.", "user_responses": {"persona": "Alex, 28, ships MVPs for clients"}},
            4: {"ai_analysis": "TAM: ~45k indie developers globally, ~$300M annual spend.", "user_responses": {"tam": "$300M TAM"}},
            5: {"ai_analysis": "Persona pain: time-to-first-commit, context switching.", "user_responses": {"pain": "Slow project ramp, context switching"}},
            6: {"ai_analysis": "Lifecycle: brief intake → scaffold → iterate → export/deploy.", "user_responses": {}},
            7: {"ai_analysis": "Spec: chat-based builder, framework guidance, live preview, export.", "user_responses": {}},
            8: {"ai_analysis": "Value: 70% faster delivery; 60% cost reduction.", "user_responses": {}},
            9: {"ai_analysis": "Next customers: freelancers, bootcamps, micro-agencies.", "user_responses": {}},
            10: {"ai_analysis": "Core: integrated business + code guidance.", "user_responses": {}},
            11: {"ai_analysis": "Position: faster than no-code, more guided than Copilot.", "user_responses": {}},
            12: {"ai_analysis": "DMU: indie dev (user + buyer).", "user_responses": {}},
            13: {"ai_analysis": "Acquisition: content, communities, referrals.", "user_responses": {}},
            14: {"ai_analysis": "Follow-on TAM: small teams, edu, enterprise prototypes.", "user_responses": {}},
            15: {"ai_analysis": "Model: SaaS subscriptions (free, Pro, Team).", "user_responses": {}},
            16: {"ai_analysis": "Pricing: $29 Pro, $99 Team seat.", "user_responses": {}},
            17: {"ai_analysis": "LTV: $450 indie; $2.4k team cohorts.", "user_responses": {}},
            18: {"ai_analysis": "Sales: PLG with upgrade nudges; demos for teams.", "user_responses": {}},
            19: {"ai_analysis": "COCA: <$75 target via content + referrals.", "user_responses": {}},
            20: {"ai_analysis": "Key assumptions: AI quality, conversion 12%+, churn <8%.", "user_responses": {}},
            21: {"ai_analysis": "MVP test: guided framework + code preview + export.", "user_responses": {}},
            22: {"ai_analysis": "Assumption tests: completion rate, preview success, exports.", "user_responses": {}},
            23: {"ai_analysis": "MVBP: paid Pro tier with export/deploy reliability.", "user_responses": {}},
            24: {"ai_analysis": "Product plan: improve preview, add team collab, enterprise pilots.", "user_responses": {}},
        }
    
    def initialize_framework(self, project_id: str, idea_description: str) -> Dict:
        """Initialize a new framework session for a project."""
        session = {
            "project_id": project_id,
            "idea_description": idea_description,
            "current_step": 1,
            "current_phase": FrameworkPhase.CUSTOMER,
            "steps": {str(step["number"]): {
                **step,
                "status": StepStatus.NOT_STARTED,
                "user_responses": {},
                "ai_analysis": None,
                "completed_at": None
            } for step in MIT_24_STEPS},
            "framework_summary": None,
            "ready_for_development": False,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        self.sessions[project_id] = session
        return session
    
    def initialize_sample_framework(self, project_id: str, idea_description: str = "Sample: Intelekt - AI MVP Copilot") -> Dict:
        """Initialize a sample session with prefilled analyses for demo/preview."""
        session = self.initialize_framework(project_id, idea_description)
        for step_num, payload in self.sample_responses.items():
            key = str(step_num)
            if key in session["steps"]:
                session["steps"][key]["ai_analysis"] = payload.get("ai_analysis")
                session["steps"][key]["user_responses"] = payload.get("user_responses", {})
                session["steps"][key]["status"] = StepStatus.COMPLETED
                session["steps"][key]["completed_at"] = datetime.now().isoformat()
        session["current_step"] = 24
        session["current_phase"] = FrameworkPhase.SCALING
        session["ready_for_development"] = True
        session["updated_at"] = datetime.now().isoformat()
        self.sessions[project_id] = session
        return session
    
    def fast_track_framework(self, project_id: str, idea_description: str) -> Dict:
        """Fast-track by marking key steps as skipped to allow development quickly."""
        session = self.initialize_framework(project_id, idea_description)
        required_steps = [1, 2, 5, 7, 8, 21]
        for step_num in required_steps:
            key = str(step_num)
            session["steps"][key]["status"] = StepStatus.SKIPPED
            session["steps"][key]["ai_analysis"] = session["steps"][key]["ai_analysis"] or "Fast-tracked placeholder - please refine."
            session["steps"][key]["completed_at"] = datetime.now().isoformat()
        session["current_step"] = max(required_steps)
        session["current_phase"] = session["steps"][str(session["current_step"])]["phase"]
        session["ready_for_development"] = True
        session["updated_at"] = datetime.now().isoformat()
        self.sessions[project_id] = session
        return session
    
    def get_session(self, project_id: str) -> Optional[Dict]:
        """Get the framework session for a project."""
        return self.sessions.get(project_id)
    
    def get_current_step(self, project_id: str) -> Optional[Dict]:
        """Get the current step for a project."""
        session = self.get_session(project_id)
        if not session:
            return None
        return session["steps"].get(str(session["current_step"]))
    
    def update_step(
        self, 
        project_id: str, 
        step_number: int, 
        user_responses: Dict[str, Any],
        ai_analysis: str
    ) -> Dict:
        """Update a step with user responses and AI analysis."""
        session = self.get_session(project_id)
        if not session:
            raise ValueError(f"No framework session for project {project_id}")
        
        step_key = str(step_number)
        if step_key not in session["steps"]:
            raise ValueError(f"Invalid step number: {step_number}")
        
        session["steps"][step_key]["user_responses"] = user_responses
        session["steps"][step_key]["ai_analysis"] = ai_analysis
        session["steps"][step_key]["status"] = StepStatus.COMPLETED
        session["steps"][step_key]["completed_at"] = datetime.now().isoformat()
        session["updated_at"] = datetime.now().isoformat()
        
        return session["steps"][step_key]
    
    def advance_to_next_step(self, project_id: str) -> Optional[Dict]:
        """Move to the next step in the framework."""
        session = self.get_session(project_id)
        if not session:
            return None
        
        current = session["current_step"]
        if current >= 24:
            session["ready_for_development"] = True
            return None
        
        session["current_step"] = current + 1
        next_step = session["steps"][str(current + 1)]
        
        # Update phase if needed
        session["current_phase"] = next_step["phase"]
        session["steps"][str(current + 1)]["status"] = StepStatus.IN_PROGRESS
        session["updated_at"] = datetime.now().isoformat()
        
        return next_step
    
    def skip_step(self, project_id: str, step_number: int) -> Dict:
        """Skip a step (for advanced users)."""
        session = self.get_session(project_id)
        if not session:
            raise ValueError(f"No framework session for project {project_id}")
        
        step_key = str(step_number)
        session["steps"][step_key]["status"] = StepStatus.SKIPPED
        session["updated_at"] = datetime.now().isoformat()
        
        return self.advance_to_next_step(project_id)
    
    def get_framework_progress(self, project_id: str) -> Dict:
        """Get overall framework progress."""
        session = self.get_session(project_id)
        if not session:
            return {"error": "No session found"}
        
        total_steps = 24
        completed = sum(
            1 for s in session["steps"].values() 
            if s["status"] in [StepStatus.COMPLETED, StepStatus.SKIPPED]
        )
        
        return {
            "current_step": session["current_step"],
            "current_phase": session["current_phase"],
            "completed_steps": completed,
            "total_steps": total_steps,
            "progress_percentage": round((completed / total_steps) * 100),
            "ready_for_development": session["ready_for_development"],
            "phases_completed": self._get_phases_completed(session)
        }
    
    def _get_phases_completed(self, session: Dict) -> Dict[str, bool]:
        """Check which phases are completed."""
        phase_steps = {
            FrameworkPhase.CUSTOMER: [1, 2, 3, 4, 5],
            FrameworkPhase.VALUE: [6, 7, 8, 9],
            FrameworkPhase.ACQUISITION: [10, 11, 12, 13, 14],
            FrameworkPhase.MONETIZATION: [15, 16, 17],
            FrameworkPhase.BUILDING: [18, 19, 20],
            FrameworkPhase.SCALING: [21, 22, 23, 24]
        }
        
        return {
            phase.value: all(
                session["steps"][str(step)]["status"] in [StepStatus.COMPLETED, StepStatus.SKIPPED]
                for step in steps
            )
            for phase, steps in phase_steps.items()
        }
    
    def generate_framework_summary(self, project_id: str) -> Dict:
        """Generate a comprehensive summary of the framework analysis."""
        session = self.get_session(project_id)
        if not session:
            return {"error": "No session found"}
        
        summary = {
            "idea": session["idea_description"],
            "beachhead_market": session["steps"]["2"].get("ai_analysis", ""),
            "persona": session["steps"]["5"].get("ai_analysis", ""),
            "value_proposition": session["steps"]["8"].get("ai_analysis", ""),
            "business_model": session["steps"]["15"].get("ai_analysis", ""),
            "mvp_specification": session["steps"]["21"].get("ai_analysis", ""),
            "product_plan": session["steps"]["24"].get("ai_analysis", ""),
            "key_insights": self._extract_key_insights(session),
            "ready_for_development": session["ready_for_development"]
        }
        
        session["framework_summary"] = summary
        return summary
    
    def _extract_key_insights(self, session: Dict) -> List[str]:
        """Extract key insights from completed steps."""
        insights = []
        for step_num, step in session["steps"].items():
            if step["status"] == StepStatus.COMPLETED and step.get("ai_analysis"):
                # Extract first sentence or key point from analysis
                analysis = step["ai_analysis"]
                if analysis:
                    first_sentence = analysis.split('.')[0]
                    if len(first_sentence) < 200:
                        insights.append(f"Step {step_num}: {first_sentence}")
        return insights[:10]  # Top 10 insights
    
    def can_start_development(self, project_id: str) -> Dict:
        """Check if the project is ready to start development."""
        session = self.get_session(project_id)
        if not session:
            return {"can_start": False, "reason": "No framework session found"}
        
        # Minimum requirements to start development
        required_steps = [1, 2, 5, 7, 8, 21]  # Market, Beachhead, Persona, Product Spec, Value Prop, MVP
        
        missing_steps = []
        for step_num in required_steps:
            step = session["steps"][str(step_num)]
            if step["status"] not in [StepStatus.COMPLETED, StepStatus.SKIPPED]:
                missing_steps.append(f"Step {step_num}: {step['name']}")
        
        if missing_steps:
            return {
                "can_start": False,
                "reason": "Required steps not completed",
                "missing_steps": missing_steps
            }
        
        return {
            "can_start": True,
            "reason": "All required framework steps completed",
            "recommendation": "Proceed with MVP development"
        }
    
    def get_framework_prompt_for_step(self, project_id: str) -> str:
        """Generate the AI system prompt for the current framework step."""
        session = self.get_session(project_id)
        if not session:
            return ""
        
        current_step = self.get_current_step(project_id)
        if not current_step:
            return ""
        
        # Gather context from previous steps
        previous_context = []
        for i in range(1, current_step["number"]):
            step = session["steps"][str(i)]
            if step["status"] == StepStatus.COMPLETED and step.get("ai_analysis"):
                previous_context.append(f"**Step {i} - {step['name']}**: {step['ai_analysis'][:500]}...")
        
        prompt = f"""You are Intelekt, an AI startup advisor using the MIT 24-Step Disciplined Entrepreneurship Framework.

CURRENT STATE:
- User's Idea: {session['idea_description']}
- Current Step: {current_step['number']} of 24 - {current_step['name']}
- Phase: {current_step['phase'].value.upper()}

STEP DETAILS:
{current_step['description']}

KEY QUESTIONS TO EXPLORE:
{chr(10).join(f"- {q}" for q in current_step['key_questions'])}

EXPECTED DELIVERABLES:
{chr(10).join(f"- {d}" for d in current_step['deliverables'])}

{"PREVIOUS ANALYSIS:" + chr(10) + chr(10).join(previous_context) if previous_context else ""}

YOUR ROLE:
1. Guide the user through this specific step
2. Ask clarifying questions based on the key questions above
3. Help brainstorm and analyze their responses
4. Provide constructive feedback and suggestions
5. Summarize findings when the step is complete
6. Do NOT generate any code yet - focus purely on business analysis

RESPONSE FORMAT:
- Be conversational and encouraging
- Ask one or two questions at a time
- Provide examples when helpful
- Challenge assumptions constructively
- When the user has answered sufficiently, provide a summary and ask if they're ready to move to the next step

Remember: Great products start with great understanding of customers and markets. Help the user build a solid foundation before any code is written."""

        return prompt
    
    def export_framework_document(self, project_id: str) -> str:
        """Export the framework analysis as a formatted document."""
        session = self.get_session(project_id)
        if not session:
            return "No framework session found"
        
        doc = f"""# MIT 24-Step Framework Analysis
## Project: {session['idea_description']}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}

---

"""
        phase_names = {
            FrameworkPhase.CUSTOMER: "Phase 1: Who Is Your Customer?",
            FrameworkPhase.VALUE: "Phase 2: What Can You Do For Your Customer?",
            FrameworkPhase.ACQUISITION: "Phase 3: How Do They Acquire Your Product?",
            FrameworkPhase.MONETIZATION: "Phase 4: How Do You Make Money?",
            FrameworkPhase.BUILDING: "Phase 5: How Do You Design & Build?",
            FrameworkPhase.SCALING: "Phase 6: How Do You Scale?"
        }
        
        current_phase = None
        for step_num in range(1, 25):
            step = session["steps"][str(step_num)]
            
            # Add phase header
            if step["phase"] != current_phase:
                current_phase = step["phase"]
                doc += f"\n## {phase_names[current_phase]}\n\n"
            
            status_emoji = {
                StepStatus.COMPLETED: "✅",
                StepStatus.IN_PROGRESS: "🔄",
                StepStatus.SKIPPED: "⏭️",
                StepStatus.NOT_STARTED: "⬜"
            }
            
            doc += f"### Step {step_num}: {step['name']} {status_emoji.get(step['status'], '')}\n\n"
            
            if step["status"] == StepStatus.COMPLETED:
                if step.get("user_responses"):
                    doc += "**User Inputs:**\n"
                    for key, value in step["user_responses"].items():
                        doc += f"- {key}: {value}\n"
                    doc += "\n"
                
                if step.get("ai_analysis"):
                    doc += f"**Analysis:**\n{step['ai_analysis']}\n\n"
            else:
                doc += f"*{step['description']}*\n\n"
            
            doc += "---\n"
        
        return doc


# Singleton instance
framework_service = FrameworkService()
