import * as React from "react";
import {
    X,
    ChevronUp,
    ChevronDown,
    Upload,
    CheckCircle2,
    Clock,
    Activity,
    File as FileIcon,
    Trash
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface UploadTask {
    id: string;
    name: string;
    size: number;
    progress: number;
    status: "pending" | "uploading" | "completed" | "error";
    speed?: string;
    eta?: string;
}

interface UploadDashboardProps {
    uploads: UploadTask[];
    onClose: () => void;
    onCancelUpload?: (id: string) => void;
    isOpen: boolean;
}

export function UploadDashboard({ uploads, onClose, onCancelUpload, isOpen }: UploadDashboardProps) {
    const [isMinimized, setIsMinimized] = React.useState(false);

    if (!isOpen || uploads.length === 0) return null;

    const activeCount = uploads.filter(u => u.status === "uploading" || u.status === "pending").length;
    const completedCount = uploads.filter(u => u.status === "completed").length;
    const totalProgress = uploads.reduce((acc, u) => acc + u.progress, 0) / uploads.length;

    return (
        <div className={cn(
            "fixed bottom-4 right-4 left-4 sm:left-auto z-[100] transition-all duration-300 ease-in-out",
            isMinimized ? "sm:w-72" : "sm:w-96"
        )}>
            <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-full">
                            <Upload className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-semibold">
                            {activeCount > 0 ? `Subiendo (${activeCount})` : "Completado"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(!isMinimized)}>
                            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Global Progress (Minimized View) */}
                {isMinimized && (
                    <div className="p-3 bg-muted/10">
                        <div className="flex justify-between text-[10px] mb-1.5 px-0.5">
                            <span className="text-muted-foreground">{completedCount} de {uploads.length} finalizados</span>
                            <span className="font-bold">{Math.round(totalProgress)}%</span>
                        </div>
                        <Progress value={totalProgress} className="h-1.5" />
                    </div>
                )}

                {/* Detailed View */}
                {!isMinimized && (
                    <>
                        <div className="max-h-[350px] overflow-y-auto p-3 space-y-4">
                            {uploads.map((upload) => (
                                <div key={upload.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span className="text-xs font-medium truncate" title={upload.name}>
                                                {upload.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {upload.status === "completed" ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500 fill-green-500/10" />
                                            ) : upload.status === "error" ? (
                                                <X className="w-4 h-4 text-destructive" />
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground font-mono translate-y-[1px]">
                                                    {Math.round(upload.progress)}%
                                                </span>
                                            )}
                                            {upload.status !== "completed" && onCancelUpload && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                    onClick={() => onCancelUpload(upload.id)}
                                                >
                                                    <Trash className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="relative pt-0.5">
                                        <Progress
                                            value={upload.progress}
                                            className={cn(
                                                "h-1.5 transition-all",
                                                upload.status === "completed" ? "bg-green-100" :
                                                    upload.status === "error" ? "bg-red-100" : ""
                                            )}
                                        />
                                    </div>

                                    {upload.status === "uploading" && (
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground pl-0.5">
                                            <div className="flex items-center gap-1">
                                                <Activity className="w-3 h-3 text-primary animate-pulse" />
                                                <span className="whitespace-nowrap">{upload.speed || "calculando..."}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span className="whitespace-nowrap">Faltan: {upload.eta || "--:--"}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t bg-muted/20 text-center">
                            <p className="text-[10px] text-muted-foreground">
                                {completedCount} archivos completados de {uploads.length}
                            </p>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
