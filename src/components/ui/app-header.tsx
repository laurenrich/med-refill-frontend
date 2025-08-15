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
import { ArrowLeft, BarChart3, Clock, Home, LogOut, UploadCloud, Users } from "lucide-react"
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
    { value: "dashboard", label: "Dashboard", icon: Home },
    { value: "patients", label: "Patients", icon: Users },
    { value: "analysis", label: "Analysis", icon: BarChart3 },
    { value: "history", label: "History", icon: Clock },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="w-full sticky top-0 z-50 transition-all duration-200">
      <div className="w-full flex h-20 items-center px-6 pt-4">
        {/* Left: Back Button */}
        <div className="flex items-center gap-4 flex-shrink-0">
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
        </div>

        {/* Center: Navigation Tabs */}
        <div className="flex-1 flex justify-center">
          <div className="max-w-7xl mx-auto px-6 transform translate-x-14">
            <nav className={`flex items-center justify-center transition-all duration-500 ease-out ${
              isScrolled ? 'gap-0 bg-gray-100/90 backdrop-blur-md rounded-full px-4 py-2' : 'gap-4'
            }`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            
            return (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={`group relative flex items-center justify-center transition-all duration-500 ease-out hover:scale-105 overflow-hidden rounded-full ${
                  isScrolled 
                    ? 'w-10 h-10 hover:w-auto hover:px-3 bg-transparent hover:bg-gray-100/50' 
                    : isActive 
                      ? 'w-12 h-12 hover:w-auto hover:px-4 bg-blue-100' 
                      : 'w-12 h-12 hover:w-auto hover:px-4 bg-gray-100 hover:bg-gray-200'
                }`}
                aria-label={tab.label}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-500 ease-out ${
                  isActive ? 'text-blue-600 scale-110' : 'text-gray-600 group-hover:text-gray-800 group-hover:scale-105'
                }`} />

                {/* Text Label - Show on Hover for All Tabs */}
                <span
                  className={`font-medium text-sm whitespace-nowrap transition-all duration-500 ease-out ${
                    isActive 
                      ? 'text-blue-600 hidden group-hover:block group-hover:ml-3 group-hover:relative group-hover:translate-x-0' 
                      : 'text-gray-700 hidden group-hover:block group-hover:ml-3 group-hover:relative group-hover:translate-x-0'
                  }`}
                >
                {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
          </div>
        </div>

        {/* Right: Upload + Profile */}
        <div className={`flex items-center transition-all duration-500 ease-out flex-shrink-0 ${
          isScrolled ? 'gap-0 bg-gray-100/90 backdrop-blur-md rounded-full px-4 py-2' : 'gap-3'
        }`}>
          {/* Upload Button */}
          <button
            onClick={onUpload}
            className={`group relative flex items-center justify-center transition-all duration-500 ease-out hover:scale-105 overflow-hidden rounded-full ${
              isScrolled 
                ? 'w-10 h-10 hover:w-auto hover:px-3 bg-transparent hover:bg-gray-100/50' 
                : 'w-12 h-12 hover:w-auto hover:px-4 bg-gray-100 hover:bg-gray-200'
            } text-gray-600 hover:text-gray-800`}
            aria-label="Upload"
          >
            <UploadCloud className="w-5 h-5 transition-transform duration-300 group-hover:scale-105" />
            <span className="font-medium text-sm whitespace-nowrap transition-all duration-300 text-gray-700 hidden group-hover:block group-hover:ml-3 group-hover:relative group-hover:translate-x-0">
              Upload
            </span>
          </button>
          
          {/* Profile Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`group relative flex items-center justify-center transition-all duration-500 ease-out hover:scale-105 rounded-full ${
                isScrolled 
                  ? 'w-10 h-10 bg-transparent hover:bg-gray-100/50' 
                  : 'w-12 h-12 bg-gray-100 hover:bg-gray-200'
              } text-gray-600 hover:text-gray-800`}>
                <Avatar className={`transition-all duration-500 ease-out ${
                  isScrolled ? 'w-6 h-6' : 'w-8 h-8'
                }`}>
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gray-500 text-white text-sm font-normal">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
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
