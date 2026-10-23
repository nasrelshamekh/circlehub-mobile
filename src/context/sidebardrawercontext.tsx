import { createContext, useContext } from "react";

export type SidebarDrawerContextType = {
    isOpen: boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
};

export const SidebarDrawerContext = createContext<SidebarDrawerContextType>({
    isOpen: false,
    openSidebar: () => {},
    closeSidebar: () => {},
});

export function useSidebarDrawer(): SidebarDrawerContextType {
    return useContext(SidebarDrawerContext);
}
