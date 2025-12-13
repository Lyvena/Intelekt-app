"""
Team & Collaboration API Routes

Endpoints for team management, messaging, channels,
and notifications.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from models.project_management import (
    TeamRole, MessageCreate, MessageType, NotificationType
)
from services.collaboration_service import collaboration_service

router = APIRouter(prefix="/api/team", tags=["team-collaboration"])


# ============== TEAM MEMBERS ==============

@router.post("/{project_id}/members")
async def add_team_member(
    project_id: str,
    user_id: str,
    username: str,
    email: str,
    role: TeamRole = TeamRole.DEVELOPER,
    full_name: Optional[str] = None,
    avatar_url: Optional[str] = None
):
    """Add a team member to a project."""
    member = collaboration_service.add_team_member(
        project_id=project_id,
        user_id=user_id,
        username=username,
        email=email,
        role=role,
        full_name=full_name,
        avatar_url=avatar_url
    )
    return {"success": True, "member": member}


@router.get("/{project_id}/members")
async def get_team_members(project_id: str):
    """Get all team members for a project."""
    members = collaboration_service.get_team_members(project_id)
    return {"members": members, "count": len(members)}


@router.get("/{project_id}/members/{user_id}")
async def get_team_member(project_id: str, user_id: str):
    """Get a specific team member."""
    member = collaboration_service.get_team_member(project_id, user_id)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    return {"member": member}


@router.patch("/{project_id}/members/{user_id}/role")
async def update_member_role(
    project_id: str,
    user_id: str,
    new_role: TeamRole,
    updated_by: str = Query(...)
):
    """Update a team member's role."""
    member = collaboration_service.update_team_member_role(
        project_id=project_id,
        user_id=user_id,
        new_role=new_role,
        updated_by=updated_by
    )
    if not member:
        raise HTTPException(status_code=400, detail="Cannot update role or insufficient permissions")
    return {"success": True, "member": member}


@router.delete("/{project_id}/members/{user_id}")
async def remove_team_member(
    project_id: str,
    user_id: str,
    removed_by: str = Query(...)
):
    """Remove a team member from a project."""
    success = collaboration_service.remove_team_member(
        project_id=project_id,
        user_id=user_id,
        removed_by=removed_by
    )
    if not success:
        raise HTTPException(status_code=400, detail="Cannot remove member or insufficient permissions")
    return {"success": True}


# ============== TEAM INVITES ==============

@router.post("/{project_id}/invites")
async def create_invite(
    project_id: str,
    email: str,
    role: TeamRole = TeamRole.DEVELOPER,
    invited_by: str = Query(...)
):
    """Create an invitation to join a project."""
    invite = collaboration_service.create_invite(
        project_id=project_id,
        email=email,
        role=role,
        invited_by=invited_by
    )
    return {"success": True, "invite": invite}


@router.get("/{project_id}/invites")
async def get_pending_invites(project_id: str):
    """Get pending invitations for a project."""
    invites = collaboration_service.get_pending_invites(project_id)
    return {"invites": invites, "count": len(invites)}


@router.post("/invites/{invite_id}/accept")
async def accept_invite(
    invite_id: str,
    user_id: str,
    username: str,
    email: str,
    full_name: Optional[str] = None
):
    """Accept a team invitation."""
    member = collaboration_service.accept_invite(
        invite_id=invite_id,
        user_id=user_id,
        username=username,
        email=email,
        full_name=full_name
    )
    if not member:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation")
    return {"success": True, "member": member}


# ============== CHANNELS ==============

@router.post("/{project_id}/channels")
async def create_channel(
    project_id: str,
    name: str,
    created_by: str,
    description: str = "",
    is_private: bool = False,
    member_ids: List[str] = Query(default=[])
):
    """Create a new channel."""
    channel = collaboration_service.create_channel(
        project_id=project_id,
        name=name,
        created_by=created_by,
        description=description,
        is_private=is_private,
        member_ids=member_ids
    )
    return {"success": True, "channel": channel}


@router.post("/{project_id}/channels/dm")
async def create_direct_channel(
    project_id: str,
    user1_id: str,
    user2_id: str
):
    """Create a direct message channel between two users."""
    channel = collaboration_service.create_direct_channel(
        project_id=project_id,
        user1_id=user1_id,
        user2_id=user2_id
    )
    return {"success": True, "channel": channel}


@router.get("/{project_id}/channels")
async def get_channels(
    project_id: str,
    user_id: str = Query(...)
):
    """Get all channels accessible to a user."""
    channels = collaboration_service.get_channels(project_id, user_id)
    return {"channels": channels, "count": len(channels)}


@router.get("/{project_id}/channels/{channel_id}")
async def get_channel(project_id: str, channel_id: str):
    """Get a specific channel."""
    channel = collaboration_service.get_channel(project_id, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return {"channel": channel}


# ============== MESSAGES ==============

@router.post("/{project_id}/channels/{channel_id}/messages")
async def send_message(
    project_id: str,
    channel_id: str,
    content: str,
    user_id: str = Query(...),
    user_name: str = Query(...),
    message_type: MessageType = MessageType.TEXT,
    code_language: Optional[str] = None,
    thread_id: Optional[str] = None,
    mentions: List[str] = Query(default=[]),
    user_avatar: Optional[str] = None
):
    """Send a message to a channel."""
    message_data = MessageCreate(
        content=content,
        type=message_type,
        code_language=code_language,
        thread_id=thread_id,
        mentions=mentions
    )
    
    message = collaboration_service.send_message(
        channel_id=channel_id,
        project_id=project_id,
        user_id=user_id,
        user_name=user_name,
        message_data=message_data,
        user_avatar=user_avatar
    )
    return {"success": True, "message": message}


@router.get("/{project_id}/channels/{channel_id}/messages")
async def get_messages(
    project_id: str,
    channel_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    thread_id: Optional[str] = None
):
    """Get messages from a channel."""
    messages = collaboration_service.get_messages(
        channel_id=channel_id,
        limit=limit,
        before=before,
        thread_id=thread_id
    )
    return {"messages": messages, "count": len(messages)}


@router.patch("/{project_id}/channels/{channel_id}/messages/{message_id}")
async def edit_message(
    project_id: str,
    channel_id: str,
    message_id: str,
    content: str,
    user_id: str = Query(...)
):
    """Edit a message."""
    message = collaboration_service.edit_message(
        channel_id=channel_id,
        message_id=message_id,
        user_id=user_id,
        new_content=content
    )
    if not message:
        raise HTTPException(status_code=400, detail="Cannot edit message")
    return {"success": True, "message": message}


@router.delete("/{project_id}/channels/{channel_id}/messages/{message_id}")
async def delete_message(
    project_id: str,
    channel_id: str,
    message_id: str,
    user_id: str = Query(...)
):
    """Delete a message."""
    success = collaboration_service.delete_message(
        channel_id=channel_id,
        message_id=message_id,
        user_id=user_id
    )
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete message")
    return {"success": True}


@router.post("/{project_id}/channels/{channel_id}/messages/{message_id}/reactions")
async def add_reaction(
    project_id: str,
    channel_id: str,
    message_id: str,
    emoji: str,
    user_id: str = Query(...)
):
    """Add a reaction to a message."""
    message = collaboration_service.add_reaction(
        channel_id=channel_id,
        message_id=message_id,
        user_id=user_id,
        emoji=emoji
    )
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"success": True, "message": message}


@router.delete("/{project_id}/channels/{channel_id}/messages/{message_id}/reactions/{emoji}")
async def remove_reaction(
    project_id: str,
    channel_id: str,
    message_id: str,
    emoji: str,
    user_id: str = Query(...)
):
    """Remove a reaction from a message."""
    message = collaboration_service.remove_reaction(
        channel_id=channel_id,
        message_id=message_id,
        user_id=user_id,
        emoji=emoji
    )
    return {"success": True}


# ============== TYPING INDICATORS ==============

@router.post("/{project_id}/channels/{channel_id}/typing")
async def set_typing(
    project_id: str,
    channel_id: str,
    user_id: str = Query(...)
):
    """Set user as typing in a channel."""
    collaboration_service.set_typing(channel_id, user_id)
    return {"success": True}


@router.get("/{project_id}/channels/{channel_id}/typing")
async def get_typing_users(project_id: str, channel_id: str):
    """Get users currently typing in a channel."""
    users = collaboration_service.get_typing_users(channel_id)
    return {"typing_users": users}


# ============== NOTIFICATIONS ==============

@router.get("/notifications")
async def get_notifications(
    user_id: str = Query(...),
    limit: int = 50,
    unread_only: bool = False
):
    """Get notifications for a user."""
    notifications = collaboration_service.get_notifications(
        user_id=user_id,
        limit=limit,
        unread_only=unread_only
    )
    return {"notifications": notifications, "count": len(notifications)}


@router.get("/notifications/unread-count")
async def get_unread_count(user_id: str = Query(...)):
    """Get unread notification count."""
    count = collaboration_service.get_unread_count(user_id)
    return {"unread_count": count}


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user_id: str = Query(...)
):
    """Mark a notification as read."""
    success = collaboration_service.mark_notification_read(user_id, notification_id)
    return {"success": success}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(user_id: str = Query(...)):
    """Mark all notifications as read."""
    count = collaboration_service.mark_all_notifications_read(user_id)
    return {"success": True, "marked_count": count}


# ============== PRESENCE ==============

@router.post("/{project_id}/presence/online")
async def set_user_online(project_id: str, user_id: str = Query(...)):
    """Set user as online in a project."""
    collaboration_service.set_user_online(project_id, user_id)
    return {"success": True}


@router.post("/{project_id}/presence/offline")
async def set_user_offline(project_id: str, user_id: str = Query(...)):
    """Set user as offline in a project."""
    collaboration_service.set_user_offline(project_id, user_id)
    return {"success": True}


@router.get("/{project_id}/presence")
async def get_online_users(project_id: str):
    """Get list of online users in a project."""
    users = collaboration_service.get_online_users(project_id)
    return {"online_users": users, "count": len(users)}
