import {
    Bell,
    CheckCircle2,
    Heart,
    MessageCircle,
    ShieldCheck,
    Trash2,
    UserMinus,
    UserPlus,
    Users,
    XCircle,
} from "lucide-react-native";
import React from "react";

import { NotificationType } from "@/types/notification";

export function NotificationTypeBadgeIcon({
    type,
    size = 10,
    color = "#FFFFFF",
}: {
    type: NotificationType;
    size?: number;
    color?: string;
}) {
    switch (type) {
        case "Follow":
            return <UserPlus size={size} color={color} />;
        case "PostLike":
            return <Heart size={size} color={color} />;
        case "PostComment":
            return <MessageCircle size={size} color={color} />;
        case "CommunityJoinRequested":
            return <Users size={size} color={color} />;
        case "CommunityJoinRequestApproved":
            return <CheckCircle2 size={size} color={color} />;
        case "CommunityJoinRequestRejected":
            return <XCircle size={size} color={color} />;
        case "CommunityMemberRemoved":
            return <UserMinus size={size} color={color} />;
        case "CommunityRoleChanged":
            return <ShieldCheck size={size} color={color} />;
        case "CommunityPostRemoved":
            return <Trash2 size={size} color={color} />;
        default:
            return <Bell size={size} color={color} />;
    }
}
