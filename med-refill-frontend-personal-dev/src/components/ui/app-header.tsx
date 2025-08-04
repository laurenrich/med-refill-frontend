import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, Home as HomeIcon, User, Users, UploadCloud, Clock, List, ArrowLeft } from "lucide-react"
import { useAuth } from "@/context/AuthContext";

interface AppHeaderProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  onUpload?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function AppHeader({ activeTab, onTabChange, onUpload, showBackButton, onBack }: AppHeaderProps) {
  const { authState, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const user: any = authState?.user || {};
  const displayName =
    user?.name ||
    (user?.first_name && user?.last_name ? `${user?.first_name} ${user?.last_name}` : "") ||
    user?.username ||
    "User";
  const username = user?.username || user?.email || "";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const tabs = [
    { value: "dashboard", label: "Dashboard", icon: HomeIcon },
    { value: "patients", label: "Patients", icon: List },
    { value: "analysis", label: "Patient Analysis", icon: User },
    { value: "batch", label: "Batch Processing", icon: Users },
    { value: "history", label: "Patient History", icon: Clock },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`w-full bg-white sticky top-0 z-50 transition-all duration-200 ${
      isScrolled ? 'border-b border-gray-200' : ''
    }`}>
      <div className="w-full flex h-16 items-center justify-between px-6">
        {/* Left: Logo + Back Button */}
        <div className="flex items-center gap-4">
          {showBackButton && onBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <h1 className="text-base font-normal text-gray-700">Refill & Diagnosis AI</h1>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={`flex items-center gap-2 text-sm font-normal transition-colors ${
                  activeTab === tab.value
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Upload + Profile */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 hover:bg-gray-100"
            onClick={onUpload}
          >
            <UploadCloud className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-gray-100 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gray-500 text-white text-sm font-normal">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-normal leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
