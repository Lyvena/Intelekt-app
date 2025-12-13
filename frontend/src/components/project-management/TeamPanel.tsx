import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  X,
  Clock
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
  joined_at: string;
  last_active?: string;
  is_active: boolean;
}

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  invited_at: string;
  expires_at: string;
}

interface TeamPanelProps {
  projectId: string;
  members: TeamMember[];
  invites: TeamInvite[];
  onlineUsers: string[];
  currentUserId: string;
  onInvite: (email: string, role: string) => void;
  onUpdateRole: (userId: string, newRole: string) => void;
  onRemoveMember: (userId: string) => void;
  canManageTeam: boolean;
}

const ROLES = [
  { id: 'owner', label: 'Owner', description: 'Full access to everything' },
  { id: 'admin', label: 'Admin', description: 'Can manage team and settings' },
  { id: 'product_manager', label: 'Product Manager', description: 'Can manage sprints and backlog' },
  { id: 'developer', label: 'Developer', description: 'Can create and edit tasks' },
  { id: 'designer', label: 'Designer', description: 'Can create and edit tasks' },
  { id: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  product_manager: 'bg-blue-100 text-blue-700',
  developer: 'bg-green-100 text-green-700',
  designer: 'bg-pink-100 text-pink-700',
  viewer: 'bg-gray-100 text-gray-700',
};

export const TeamPanel: React.FC<TeamPanelProps> = ({
  members,
  invites,
  onlineUsers,
  currentUserId,
  onInvite,
  onUpdateRole,
  onRemoveMember,
  canManageTeam,
}) => {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('developer');
  const [editingMember, setEditingMember] = useState<string | null>(null);

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      onInvite(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteRole('developer');
      setShowInviteForm(false);
    }
  };

  const isOnline = (userId: string) => onlineUsers.includes(userId);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Team</h3>
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {members.length} members
          </span>
        </div>
        {canManageTeam && (
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
          >
            <UserPlus className="w-4 h-4" />
            Invite
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Invite Team Member</span>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              {ROLES.filter(r => r.id !== 'owner').map(role => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
            <button
              onClick={handleInvite}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
            >
              Send
            </button>
            <button
              onClick={() => setShowInviteForm(false)}
              className="px-3 py-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {members.map(member => (
          <div
            key={member.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {(member.full_name || member.username).charAt(0).toUpperCase()}
                  </span>
                </div>
                {/* Online indicator */}
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${
                    isOnline(member.user_id) ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
              </div>

              {/* Info */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {member.full_name || member.username}
                  </span>
                  {member.user_id === currentUserId && (
                    <span className="text-xs text-gray-500">(you)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{member.email}</span>
                </div>
              </div>
            </div>

            {/* Role & Actions */}
            <div className="flex items-center gap-2">
              {editingMember === member.id && canManageTeam && member.role !== 'owner' ? (
                <select
                  value={member.role}
                  onChange={(e) => {
                    onUpdateRole(member.user_id, e.target.value);
                    setEditingMember(null);
                  }}
                  onBlur={() => setEditingMember(null)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                  autoFocus
                >
                  {ROLES.filter(r => r.id !== 'owner').map(role => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </select>
              ) : (
                <span
                  onClick={() => canManageTeam && member.role !== 'owner' && setEditingMember(member.id)}
                  className={`px-2 py-1 text-xs font-medium rounded cursor-pointer ${ROLE_COLORS[member.role]}`}
                >
                  {ROLES.find(r => r.id === member.role)?.label || member.role}
                </span>
              )}

              {canManageTeam && member.role !== 'owner' && member.user_id !== currentUserId && (
                <button
                  onClick={() => onRemoveMember(member.user_id)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  title="Remove member"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800">
            <span className="text-xs font-medium text-gray-500 uppercase">Pending Invites</span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {invites.map(invite => (
              <div
                key={invite.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <span className="text-gray-900 dark:text-white">{invite.email}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      Expires {new Date(invite.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${ROLE_COLORS[invite.role]}`}>
                  {ROLES.find(r => r.id === invite.role)?.label || invite.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPanel;
