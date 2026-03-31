'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  async function onProfileSubmit(data: ProfileForm) {
    setProfileSuccess('');
    setProfileError('');
    try {
      await api.patch(`/users/${user?.id}`, data);
      setProfileSuccess('Profile updated successfully.');
    } catch {
      setProfileError('Failed to update profile. Please try again.');
    }
  }

  async function onPasswordSubmit(data: PasswordForm) {
    setPasswordSuccess('');
    setPasswordError('');
    try {
      await api.patch(`/users/${user?.id}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPasswordSuccess('Password changed successfully.');
      passwordForm.reset();
    } catch {
      setPasswordError('Failed to change password. Check your current password and try again.');
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-6 bg-white border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl">

        {/* Profile */}
        <Card padding="md">
          <CardHeader
            title="Profile"
            description="Update your personal information"
          />
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                {...profileForm.register('firstName')}
                error={profileForm.formState.errors.firstName?.message}
              />
              <Input
                label="Last Name"
                {...profileForm.register('lastName')}
                error={profileForm.formState.errors.lastName?.message}
              />
            </div>
            <Input
              label="Email"
              type="email"
              {...profileForm.register('email')}
              error={profileForm.formState.errors.email?.message}
            />
            {profileSuccess && <p className="text-sm text-success-600">{profileSuccess}</p>}
            {profileError && <p className="text-sm text-danger-600">{profileError}</p>}
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={profileForm.formState.isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Password */}
        <Card padding="md">
          <CardHeader
            title="Change Password"
            description="Keep your account secure with a strong password"
            
          />
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="mt-4 space-y-4">
            <Input
              label="Current Password"
              type="password"
              {...passwordForm.register('currentPassword')}
              error={passwordForm.formState.errors.currentPassword?.message}
            />
            <Input
              label="New Password"
              type="password"
              {...passwordForm.register('newPassword')}
              error={passwordForm.formState.errors.newPassword?.message}
            />
            <Input
              label="Confirm New Password"
              type="password"
              {...passwordForm.register('confirmPassword')}
              error={passwordForm.formState.errors.confirmPassword?.message}
            />
            {passwordSuccess && <p className="text-sm text-success-600">{passwordSuccess}</p>}
            {passwordError && <p className="text-sm text-danger-600">{passwordError}</p>}
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={passwordForm.formState.isSubmitting}>
                Change Password
              </Button>
            </div>
          </form>
        </Card>

        {/* Account Info */}
        <Card padding="md">
          <CardHeader
            title="Account Info"
            description="Your role and organization details"
          />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Role</span>
              <Badge variant="primary">{user?.role}</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Organization ID</span>
              <span className="text-sm text-slate-700 font-mono">{user?.organizationId ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">User ID</span>
              <span className="text-sm text-slate-700 font-mono">{user?.id ?? '—'}</span>
            </div>
          </div>
        </Card>

        {/* API Keys */}
        <Card padding="md">
          <CardHeader
            title="API Keys"
            description="Manage API keys for programmatic access"
          />
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.location.href = '/developer'}
            >
              Manage API Keys
            </Button>
          </div>
        </Card>

      </div>
    </div>
  );
}
