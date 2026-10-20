import type { User } from '@chat/contracts';
import {
  ChevronsUpDown,
  LogOut,
  MessageSquare,
  Moon,
  SquarePen,
  Sun,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
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
import { useTheme } from '@/theme/ThemeProvider';
import { NewConversationDialog } from './NewConversationDialog';
import { ProfileDialog } from './ProfileDialog';

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

/** The signed-in frame: the Conversation list in a sidebar (a sheet on mobile) beside the content. */
export function AppShell({ user }: { user: User }) {
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  return (
    <SidebarProvider>
      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        // Starting the Direct Conversation with the picked User is a later ticket.
        onPick={() => setNewConversationOpen(false)}
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
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageSquare />
                </EmptyMedia>
                <EmptyTitle>No conversations yet</EmptyTitle>
                <EmptyDescription>
                  Messages you send and receive will show up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <UserMenu user={user} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-3">
          <SidebarTrigger />
        </header>
        <main className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
          Select a conversation to start chatting.
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
