import type { ConversationSummary, User } from '@chat/contracts';
import { ChevronsUpDown, LogOut, Moon, SquarePen, Sun, UserRound, Users } from 'lucide-react';
import { useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuth } from '@/auth/AuthProvider';
import { useConnectionStatus } from '@/realtime/RealtimeProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { ConversationList } from './ConversationList';
import { ConversationView, type ConversationTarget } from './ConversationView';
import { NewConversationDialog } from './NewConversationDialog';
import { NewGroupDialog } from './NewGroupDialog';
import { ProfileDialog } from './ProfileDialog';

/** Shown while the live connection is down; Messages missed meanwhile are filled in on return. */
function ConnectionAlert() {
  if (useConnectionStatus() !== 'disconnected') return null;
  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <WifiOff />
      <AlertTitle>Connection lost</AlertTitle>
      <AlertDescription>
        Reconnecting. Missed messages will appear when it is back.
      </AlertDescription>
    </Alert>
  );
}

function UserMenu({ user }: { user: User }) {
  const { theme, setTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const { logOut } = useAuth();
  const name = user.nickname ?? user.username;
  return (
    <SidebarMenu>
      <ProfileDialog user={user} open={profileOpen} onOpenChange={setProfileOpen} />
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <Avatar className="size-8">
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate font-medium">{name}</span>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-56">
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <UserRound />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun /> : <Moon />}
              {theme === 'dark' ? 'Light theme' : 'Dark theme'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void logOut()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function targetOf(conversation: ConversationSummary, user: User): ConversationTarget | undefined {
  if (conversation.kind === 'group') {
    return { kind: 'group', name: conversation.name, memberCount: conversation.members.length };
  }
  const peer = conversation.members.find((m) => m.id !== user.id);
  return peer && { kind: 'direct', peer };
}

/** The signed-in frame: the Conversation list in a sidebar (a sheet on mobile) beside the content. */
export function AppShell({ user }: { user: User }) {
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [open, setOpen] = useState<{ target: ConversationTarget; conversationId?: string }>();
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <SidebarProvider>
      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        onPick={(picked) => {
          setOpen({ target: { kind: 'direct', peer: picked } });
          setNewConversationOpen(false);
        }}
      />
      <NewGroupDialog
        open={newGroupOpen}
        onOpenChange={setNewGroupOpen}
        onCreated={(group) => {
          setOpen({
            target: { kind: 'group', name: group.name, memberCount: group.members.length },
            conversationId: group.id,
          });
          setRefreshKey((k) => k + 1);
          setNewGroupOpen(false);
        }}
      />
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between">
            <span className="px-2 py-1 text-lg font-semibold">Chat</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="New conversation"
              onClick={() => setNewConversationOpen(true)}
            >
              <SquarePen />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="New group"
              onClick={() => setNewGroupOpen(true)}
            >
              <Users />
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <ConversationList
              selectedId={open?.conversationId}
              refreshKey={refreshKey}
              onSelect={(conversation) => {
                const target = targetOf(conversation, user);
                if (target) setOpen({ target, conversationId: conversation.id });
              }}
            />
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <UserMenu user={user} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <ConnectionAlert />
        {open ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-12 items-center border-b px-3 md:hidden">
              <SidebarTrigger />
            </div>
            <ConversationView
              key={open.target.kind === 'direct' ? open.target.peer.id : open.conversationId}
              user={user}
              target={open.target}
              conversationId={open.conversationId}
              onSent={(conversationId) => {
                setOpen((current) => current && { ...current, conversationId });
                setRefreshKey((k) => k + 1);
              }}
            />
          </div>
        ) : (
          <>
            <header className="flex h-12 items-center gap-2 border-b px-3">
              <SidebarTrigger />
            </header>
            <main className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
              Select a conversation to start chatting.
            </main>
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
