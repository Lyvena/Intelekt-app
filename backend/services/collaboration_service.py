"""
Collaboration Service

Service for team management, real-time collaboration,
and communication features.
"""

from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
from uuid import uuid4
from models.project_management import (
    TeamMember, TeamInvite, TeamRole,
    Channel, Message, MessageCreate, MessageType,
    Notification, NotificationType
)


class CollaborationService:
    """Service for team collaboration and communication."""
    
    def __init__(self):
        # Team management
        self.team_members: Dict[str, Dict[str, TeamMember]] = {}  # project_id -> {user_id -> TeamMember}
        self.team_invites: Dict[str, List[TeamInvite]] = {}  # project_id -> [TeamInvite]
        
        # Messaging
        self.channels: Dict[str, Dict[str, Channel]] = {}  # project_id -> {channel_id -> Channel}
        self.messages: Dict[str, List[Message]] = {}  # channel_id -> [Message]
        
        # Notifications
        self.notifications: Dict[str, List[Notification]] = {}  # user_id -> [Notification]
        
        # Online presence
        self.online_users: Dict[str, Set[str]] = {}  # project_id -> {user_ids}
        self.user_typing: Dict[str, Dict[str, datetime]] = {}  # channel_id -> {user_id -> timestamp}
    
    # ============== TEAM MANAGEMENT ==============
    
    def add_team_member(
        self,
        project_id: str,
        user_id: str,
        username: str,
        email: str,
        role: TeamRole = TeamRole.DEVELOPER,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> TeamMember:
        """Add a team member to a project."""
        member = TeamMember(
            id=f"TM-{uuid4().hex[:8]}",
            user_id=user_id,
            project_id=project_id,
            username=username,
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            role=role,
            can_edit_tasks=role != TeamRole.VIEWER,
            can_manage_sprints=role in [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.PRODUCT_MANAGER],
            can_manage_team=role in [TeamRole.OWNER, TeamRole.ADMIN],
            can_delete_project=role == TeamRole.OWNER,
            joined_at=datetime.now()
        )
        
        if project_id not in self.team_members:
            self.team_members[project_id] = {}
        
        self.team_members[project_id][user_id] = member
        
        # Create default channel membership
        self._add_to_default_channels(project_id, user_id)
        
        return member
    
    def get_team_member(self, project_id: str, user_id: str) -> Optional[TeamMember]:
        """Get a team member."""
        if project_id not in self.team_members:
            return None
        return self.team_members[project_id].get(user_id)
    
    def get_team_members(self, project_id: str) -> List[TeamMember]:
        """Get all team members for a project."""
        if project_id not in self.team_members:
            return []
        return list(self.team_members[project_id].values())
    
    def update_team_member_role(
        self,
        project_id: str,
        user_id: str,
        new_role: TeamRole,
        updated_by: str
    ) -> Optional[TeamMember]:
        """Update a team member's role."""
        member = self.get_team_member(project_id, user_id)
        if not member:
            return None
        
        # Check permissions
        updater = self.get_team_member(project_id, updated_by)
        if not updater or not updater.can_manage_team:
            return None
        
        member.role = new_role
        member.can_edit_tasks = new_role != TeamRole.VIEWER
        member.can_manage_sprints = new_role in [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.PRODUCT_MANAGER]
        member.can_manage_team = new_role in [TeamRole.OWNER, TeamRole.ADMIN]
        
        return member
    
    def remove_team_member(
        self,
        project_id: str,
        user_id: str,
        removed_by: str
    ) -> bool:
        """Remove a team member from a project."""
        if project_id not in self.team_members:
            return False
        
        # Check permissions
        remover = self.get_team_member(project_id, removed_by)
        if not remover or not remover.can_manage_team:
            return False
        
        # Cannot remove owner
        member = self.get_team_member(project_id, user_id)
        if member and member.role == TeamRole.OWNER:
            return False
        
        if user_id in self.team_members[project_id]:
            del self.team_members[project_id][user_id]
            return True
        
        return False
    
    # ============== TEAM INVITES ==============
    
    def create_invite(
        self,
        project_id: str,
        email: str,
        role: TeamRole,
        invited_by: str
    ) -> TeamInvite:
        """Create an invitation to join a project."""
        invite = TeamInvite(
            id=f"INV-{uuid4().hex[:8]}",
            project_id=project_id,
            email=email,
            role=role,
            invited_by=invited_by,
            invited_at=datetime.now(),
            expires_at=datetime.now() + timedelta(days=7)
        )
        
        if project_id not in self.team_invites:
            self.team_invites[project_id] = []
        
        self.team_invites[project_id].append(invite)
        
        return invite
    
    def accept_invite(
        self,
        invite_id: str,
        user_id: str,
        username: str,
        email: str,
        full_name: Optional[str] = None
    ) -> Optional[TeamMember]:
        """Accept a team invitation."""
        # Find the invite
        for project_id, invites in self.team_invites.items():
            for invite in invites:
                if invite.id == invite_id and invite.email == email:
                    if invite.accepted or invite.expires_at < datetime.now():
                        return None
                    
                    invite.accepted = True
                    invite.accepted_at = datetime.now()
                    
                    # Add as team member
                    return self.add_team_member(
                        project_id=project_id,
                        user_id=user_id,
                        username=username,
                        email=email,
                        role=invite.role,
                        full_name=full_name
                    )
        
        return None
    
    def get_pending_invites(self, project_id: str) -> List[TeamInvite]:
        """Get pending invitations for a project."""
        if project_id not in self.team_invites:
            return []
        
        now = datetime.now()
        return [
            inv for inv in self.team_invites[project_id]
            if not inv.accepted and inv.expires_at > now
        ]
    
    # ============== CHANNELS ==============
    
    def create_channel(
        self,
        project_id: str,
        name: str,
        created_by: str,
        description: str = "",
        is_private: bool = False,
        member_ids: List[str] = None
    ) -> Channel:
        """Create a new channel."""
        channel_id = f"CH-{uuid4().hex[:8]}"
        
        channel = Channel(
            id=channel_id,
            project_id=project_id,
            name=name,
            description=description,
            is_private=is_private,
            member_ids=member_ids or [],
            created_at=datetime.now(),
            created_by=created_by
        )
        
        if project_id not in self.channels:
            self.channels[project_id] = {}
        
        self.channels[project_id][channel_id] = channel
        
        # Initialize message list
        self.messages[channel_id] = []
        
        return channel
    
    def create_direct_channel(
        self,
        project_id: str,
        user1_id: str,
        user2_id: str
    ) -> Channel:
        """Create a direct message channel between two users."""
        # Check if channel already exists
        existing = self._find_direct_channel(project_id, user1_id, user2_id)
        if existing:
            return existing
        
        channel_id = f"DM-{uuid4().hex[:8]}"
        
        channel = Channel(
            id=channel_id,
            project_id=project_id,
            name=f"dm-{user1_id}-{user2_id}",
            is_direct=True,
            is_private=True,
            member_ids=[user1_id, user2_id],
            created_at=datetime.now(),
            created_by=user1_id
        )
        
        if project_id not in self.channels:
            self.channels[project_id] = {}
        
        self.channels[project_id][channel_id] = channel
        self.messages[channel_id] = []
        
        return channel
    
    def _find_direct_channel(
        self,
        project_id: str,
        user1_id: str,
        user2_id: str
    ) -> Optional[Channel]:
        """Find existing direct channel between two users."""
        if project_id not in self.channels:
            return None
        
        for channel in self.channels[project_id].values():
            if channel.is_direct:
                if set(channel.member_ids) == {user1_id, user2_id}:
                    return channel
        
        return None
    
    def get_channel(self, project_id: str, channel_id: str) -> Optional[Channel]:
        """Get a channel."""
        if project_id not in self.channels:
            return None
        return self.channels[project_id].get(channel_id)
    
    def get_channels(self, project_id: str, user_id: str) -> List[Channel]:
        """Get all channels accessible to a user."""
        if project_id not in self.channels:
            return []
        
        channels = []
        for channel in self.channels[project_id].values():
            # Include public channels and private channels user is member of
            if not channel.is_private or user_id in channel.member_ids:
                channels.append(channel)
        
        return sorted(channels, key=lambda c: c.last_message_at or c.created_at, reverse=True)
    
    def _add_to_default_channels(self, project_id: str, user_id: str):
        """Add user to default project channels."""
        if project_id not in self.channels:
            # Create default general channel
            self.create_channel(
                project_id=project_id,
                name="general",
                created_by="system",
                description="General project discussion"
            )
        
        # Add to all public channels
        for channel in self.channels[project_id].values():
            if not channel.is_private and user_id not in channel.member_ids:
                channel.member_ids.append(user_id)
    
    # ============== MESSAGING ==============
    
    def send_message(
        self,
        channel_id: str,
        project_id: str,
        user_id: str,
        user_name: str,
        message_data: MessageCreate,
        user_avatar: Optional[str] = None
    ) -> Message:
        """Send a message to a channel."""
        message_id = f"MSG-{uuid4().hex[:10]}"
        
        message = Message(
            id=message_id,
            channel_id=channel_id,
            project_id=project_id,
            user_id=user_id,
            user_name=user_name,
            user_avatar=user_avatar,
            type=message_data.type,
            content=message_data.content,
            code_language=message_data.code_language,
            thread_id=message_data.thread_id,
            mentions=message_data.mentions,
            created_at=datetime.now()
        )
        
        if channel_id not in self.messages:
            self.messages[channel_id] = []
        
        self.messages[channel_id].append(message)
        
        # Update channel last message time
        channel = self.get_channel(project_id, channel_id)
        if channel:
            channel.last_message_at = message.created_at
        
        # Update reply count if this is a thread reply
        if message_data.thread_id:
            parent = self._get_message(channel_id, message_data.thread_id)
            if parent:
                parent.reply_count += 1
        
        # Create notifications for mentions
        for mentioned_user in message_data.mentions:
            self.create_notification(
                user_id=mentioned_user,
                project_id=project_id,
                type=NotificationType.MENTION,
                title="You were mentioned",
                message=f"{user_name} mentioned you in #{channel.name if channel else 'a channel'}",
                entity_type="message",
                entity_id=message_id,
                from_user_id=user_id,
                from_user_name=user_name
            )
        
        return message
    
    def get_messages(
        self,
        channel_id: str,
        limit: int = 50,
        before: Optional[str] = None,
        thread_id: Optional[str] = None
    ) -> List[Message]:
        """Get messages from a channel."""
        if channel_id not in self.messages:
            return []
        
        messages = self.messages[channel_id]
        
        # Filter by thread
        if thread_id:
            messages = [m for m in messages if m.thread_id == thread_id]
        else:
            # Only get top-level messages (not thread replies)
            messages = [m for m in messages if not m.thread_id]
        
        # Filter deleted
        messages = [m for m in messages if not m.deleted]
        
        # Sort by time (newest last)
        messages = sorted(messages, key=lambda m: m.created_at)
        
        # Pagination
        if before:
            before_idx = next(
                (i for i, m in enumerate(messages) if m.id == before),
                len(messages)
            )
            messages = messages[:before_idx]
        
        return messages[-limit:]
    
    def _get_message(self, channel_id: str, message_id: str) -> Optional[Message]:
        """Get a specific message."""
        if channel_id not in self.messages:
            return None
        
        for msg in self.messages[channel_id]:
            if msg.id == message_id:
                return msg
        return None
    
    def edit_message(
        self,
        channel_id: str,
        message_id: str,
        user_id: str,
        new_content: str
    ) -> Optional[Message]:
        """Edit a message."""
        message = self._get_message(channel_id, message_id)
        if not message or message.user_id != user_id:
            return None
        
        message.content = new_content
        message.edited = True
        message.edited_at = datetime.now()
        
        return message
    
    def delete_message(
        self,
        channel_id: str,
        message_id: str,
        user_id: str
    ) -> bool:
        """Delete (soft) a message."""
        message = self._get_message(channel_id, message_id)
        if not message or message.user_id != user_id:
            return False
        
        message.deleted = True
        message.content = "[Message deleted]"
        
        return True
    
    def add_reaction(
        self,
        channel_id: str,
        message_id: str,
        user_id: str,
        emoji: str
    ) -> Optional[Message]:
        """Add a reaction to a message."""
        message = self._get_message(channel_id, message_id)
        if not message:
            return None
        
        if emoji not in message.reactions:
            message.reactions[emoji] = []
        
        if user_id not in message.reactions[emoji]:
            message.reactions[emoji].append(user_id)
        
        return message
    
    def remove_reaction(
        self,
        channel_id: str,
        message_id: str,
        user_id: str,
        emoji: str
    ) -> Optional[Message]:
        """Remove a reaction from a message."""
        message = self._get_message(channel_id, message_id)
        if not message:
            return None
        
        if emoji in message.reactions and user_id in message.reactions[emoji]:
            message.reactions[emoji].remove(user_id)
            if not message.reactions[emoji]:
                del message.reactions[emoji]
        
        return message
    
    # ============== TYPING INDICATORS ==============
    
    def set_typing(self, channel_id: str, user_id: str):
        """Set user as typing in a channel."""
        if channel_id not in self.user_typing:
            self.user_typing[channel_id] = {}
        self.user_typing[channel_id][user_id] = datetime.now()
    
    def get_typing_users(self, channel_id: str) -> List[str]:
        """Get users currently typing in a channel."""
        if channel_id not in self.user_typing:
            return []
        
        now = datetime.now()
        typing_users = []
        expired = []
        
        for user_id, timestamp in self.user_typing[channel_id].items():
            if (now - timestamp).seconds < 5:  # 5 second timeout
                typing_users.append(user_id)
            else:
                expired.append(user_id)
        
        # Clean up expired
        for user_id in expired:
            del self.user_typing[channel_id][user_id]
        
        return typing_users
    
    # ============== NOTIFICATIONS ==============
    
    def create_notification(
        self,
        user_id: str,
        project_id: str,
        type: NotificationType,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        from_user_id: Optional[str] = None,
        from_user_name: Optional[str] = None
    ) -> Notification:
        """Create a notification for a user."""
        notification = Notification(
            id=f"NOTIF-{uuid4().hex[:8]}",
            user_id=user_id,
            project_id=project_id,
            type=type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            from_user_id=from_user_id,
            from_user_name=from_user_name,
            created_at=datetime.now()
        )
        
        if user_id not in self.notifications:
            self.notifications[user_id] = []
        
        self.notifications[user_id].insert(0, notification)
        
        # Keep only last 200 notifications
        self.notifications[user_id] = self.notifications[user_id][:200]
        
        return notification
    
    def get_notifications(
        self,
        user_id: str,
        limit: int = 50,
        unread_only: bool = False
    ) -> List[Notification]:
        """Get notifications for a user."""
        if user_id not in self.notifications:
            return []
        
        notifications = self.notifications[user_id]
        
        if unread_only:
            notifications = [n for n in notifications if not n.read]
        
        return notifications[:limit]
    
    def mark_notification_read(self, user_id: str, notification_id: str) -> bool:
        """Mark a notification as read."""
        if user_id not in self.notifications:
            return False
        
        for notification in self.notifications[user_id]:
            if notification.id == notification_id:
                notification.read = True
                notification.read_at = datetime.now()
                return True
        
        return False
    
    def mark_all_notifications_read(self, user_id: str) -> int:
        """Mark all notifications as read. Returns count marked."""
        if user_id not in self.notifications:
            return 0
        
        count = 0
        now = datetime.now()
        for notification in self.notifications[user_id]:
            if not notification.read:
                notification.read = True
                notification.read_at = now
                count += 1
        
        return count
    
    def get_unread_count(self, user_id: str) -> int:
        """Get unread notification count."""
        if user_id not in self.notifications:
            return 0
        return len([n for n in self.notifications[user_id] if not n.read])
    
    # ============== PRESENCE ==============
    
    def set_user_online(self, project_id: str, user_id: str):
        """Set user as online in a project."""
        if project_id not in self.online_users:
            self.online_users[project_id] = set()
        self.online_users[project_id].add(user_id)
        
        # Update last active
        member = self.get_team_member(project_id, user_id)
        if member:
            member.last_active = datetime.now()
    
    def set_user_offline(self, project_id: str, user_id: str):
        """Set user as offline in a project."""
        if project_id in self.online_users:
            self.online_users[project_id].discard(user_id)
    
    def get_online_users(self, project_id: str) -> List[str]:
        """Get list of online users in a project."""
        return list(self.online_users.get(project_id, set()))


# Singleton instance
collaboration_service = CollaborationService()
