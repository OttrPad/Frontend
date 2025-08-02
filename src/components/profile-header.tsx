import { Button } from "@/components/ui/button";

export function ProfileHeader() {
  return (
    <header className="relative z-20 p-6 md:p-8">
      <div className="flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-black font-bold"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">OttrPad</h1>
            <p className="text-xs text-white/50">Collaborative Editor</p>
          </div>
        </div>
        
        {/* User Profile Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button
            variant="outline"
            size="sm"
            className="bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200 p-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Button>
          
          {/* Profile Dropdown */}
          <div className="flex items-center space-x-3 bg-white/[0.05] backdrop-blur-md border border-white/[0.1] rounded-xl px-4 py-2 hover:bg-white/[0.08] transition-all duration-200 cursor-pointer">
            {/* Profile Avatar */}
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-black font-semibold text-sm">U</span>
            </div>
            
            {/* User Info */}
            <div className="hidden sm:block">
              <p className="text-white font-medium text-sm">User</p>
              <p className="text-white/50 text-xs">user@example.com</p>
            </div>
            
            {/* Dropdown Arrow */}
            <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
