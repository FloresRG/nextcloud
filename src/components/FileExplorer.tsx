import * as React from "react";
import {
    Folder,
    File,
    Search,
    Plus,
    Upload,
    RefreshCw,
    Trash2,
    ChevronRight,
    Home,
    Grid,
    List as ListIcon,
    Video,
    Image as ImageIcon,
    Music,
    FileText,
    Archive,
    MoreVertical,
    Moon,
    Sun,
    Monitor,
    ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster, toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileItem {
    name: string;
    path: string;
    isFolder: boolean;
    size: number;
    mime: string;
}

export default function FileExplorer() {
    const [currentPath, setCurrentPath] = React.useState("/");
    const [files, setFiles] = React.useState<FileItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
    const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
    const [theme, setThemeState] = React.useState<"light" | "dark">("light");

    React.useEffect(() => {
        const t = localStorage.getItem('theme') as "light" | "dark" ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setThemeState(t);
    }, []);

    const toggleTheme = () => {
        const next = theme === "light" ? "dark" : "light";
        setThemeState(next);
        document.documentElement.setAttribute('data-theme', next);
        document.documentElement.classList.toggle('dark', next === "dark");
        localStorage.setItem('theme', next);
    };

    const loadFolder = React.useCallback(async (path: string) => {
        setLoading(true);
        setCurrentPath(path);
        setSelectedPath(null);
        try {
            const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
            const res = await fetch(`/api/files${encodedPath === "/" ? "" : encodedPath}`);
            const data = await res.json();
            if (data.success) {
                setFiles(data.items || []);
            } else {
                toast.error("Error al cargar archivos: " + data.error);
            }
        } catch (err) {
            toast.error("Error de conexión al cargar carpeta");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadFolder("/");
    }, [loadFolder]);

    const filteredFiles = files.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getFileIcon = (file: FileItem) => {
        if (file.isFolder) return <Folder className="w-10 h-10 text-primary" fill="currentColor" />;
        const l = file.name.toLowerCase();
        const mime = file.mime || "";
        if (mime.includes("video") || /\.(mp4|avi|mov|mkv)$/.test(l)) return <Video className="w-10 h-10 text-orange-500" />;
        if (mime.includes("image") || /\.(jpg|jpeg|png|gif|webp)$/.test(l)) return <ImageIcon className="w-10 h-10 text-blue-500" />;
        if (mime.includes("audio") || /\.(mp3|wav|ogg)$/.test(l)) return <Music className="w-10 h-10 text-purple-500" />;
        if (mime.includes("pdf")) return <FileText className="w-10 h-10 text-red-500" />;
        if (/\.(zip|rar|7z|tar|gz)$/.test(l)) return <Archive className="w-10 h-10 text-indigo-500" />;
        return <File className="w-10 h-10 text-gray-500" />;
    };

    const handleDblClick = (file: FileItem) => {
        if (file.isFolder) {
            loadFolder(file.path);
        } else {
            const url = `http://192.168.1.50/remote.php/dav/files/admus${file.path}`;
            window.open(url, "_blank");
        }
    };

    const createFolder = async () => {
        const name = prompt("Nombre de la carpeta:");
        if (!name) return;

        try {
            const res = await fetch("/api/folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folderName: name, parentPath: currentPath })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Carpeta "${name}" creada`);
                loadFolder(currentPath);
            } else throw new Error(data.error);
        } catch (err: any) {
            toast.error("Error: " + err.message);
        }
    };

    const deleteSelection = async () => {
        if (!selectedPath) return;
        if (!confirm(`¿Estás seguro de que quieres eliminar este elemento?`)) return;

        try {
            const res = await fetch("/api/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: selectedPath })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Elemento eliminado");
                loadFolder(currentPath);
            } else throw new Error(data.error);
        } catch (err: any) {
            toast.error("Error al eliminar: " + err.message);
        }
    };

    const inputRef = React.useRef<HTMLInputElement>(null);

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        toast.promise(
            Promise.all(files.map(file => {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("folderPath", currentPath);
                return fetch("/api/upload", { method: "POST", body: formData }).then(r => r.json());
            })),
            {
                loading: `Subiendo ${files.length} archivo(s)...`,
                success: (data) => {
                    loadFolder(currentPath);
                    return "Subida completada";
                },
                error: (err) => `Error al subir: ${err.message || "Error desconocido"}`
            }
        );
        if (inputRef.current) inputRef.current.value = "";
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground">
            <Toaster position="top-right" />

            {/* Windows Explorer Style Toolbar */}
            <div className="flex items-center justify-between p-2 border-b bg-muted/30 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPath === "/"}
                        onClick={() => {
                            const parts = currentPath.split("/").filter(Boolean);
                            parts.pop();
                            loadFolder("/" + parts.join("/"));
                        }}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="w-[1px] h-6 bg-border mx-1" />
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        ref={inputRef}
                        onChange={onFileChange}
                    />
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => inputRef.current?.click()}>
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Subir</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2" onClick={createFolder}>
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Nueva Carpeta</span>
                    </Button>
                    <div className="w-[1px] h-6 bg-border mx-1" />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadFolder(currentPath)}>
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        disabled={!selectedPath}
                        onClick={deleteSelection}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                            type="search"
                            placeholder="Buscar..."
                            className="pl-9 h-9 w-[150px] md:w-[250px] bg-muted/50 focus-visible:bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                {viewMode === "grid" ? <Grid className="w-4 h-4" /> : <ListIcon className="w-4 h-4" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewMode("grid")}>Mosaicos</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setViewMode("list")}>Lista</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
                        {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Breadcrumbs Header */}
            <div className="px-4 py-2 border-b bg-background/50 flex items-center justify-between min-h-[45px]">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                className="cursor-pointer flex items-center gap-1"
                                onClick={() => loadFolder("/")}
                            >
                                <Home className="w-4 h-4 text-primary" />
                                <span>Inicio</span>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {currentPath.split("/").filter(Boolean).map((part, i, arr) => (
                            <React.Fragment key={i}>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    {i === arr.length - 1 ? (
                                        <BreadcrumbPage>{part}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink
                                            className="cursor-pointer"
                                            onClick={() => loadFolder("/" + arr.slice(0, i + 1).join("/"))}
                                        >
                                            {part}
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </React.Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="text-xs text-muted-foreground font-medium">
                    {files.length} items
                </div>
            </div>

            {/* Main File View */}
            <ScrollArea className="flex-1">
                <div className="p-4" onClick={() => setSelectedPath(null)}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 pointer-events-none">
                            <RefreshCw className="w-10 h-10 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground animate-pulse">Cargando archivos...</p>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50 pointer-events-none">
                            <Folder className="w-16 h-16 mb-4" />
                            <p>{searchQuery ? "No se encontraron resultados" : "Esta carpeta está vacía"}</p>
                        </div>
                    ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                            {filteredFiles.map((file) => (
                                <div
                                    key={file.path}
                                    className={cn(
                                        "group flex flex-col items-center p-3 rounded-lg border border-transparent transition-all cursor-pointer relative",
                                        "hover:bg-accent/50 hover:border-accent hover:shadow-sm select-none",
                                        selectedPath === file.path && "bg-primary/10 border-primary ring-1 ring-primary/20 shadow-md"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPath(file.path);
                                    }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        handleDblClick(file);
                                    }}
                                >
                                    <div className="mb-2 relative">
                                        {getFileIcon(file)}
                                        {file.isFolder && (
                                            <ChevronRight className="absolute -right-1 -bottom-1 w-4 h-4 bg-background rounded-full border shadow-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-center truncate w-full px-1" title={file.name}>
                                        {file.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {file.isFolder ? "Carpeta" : formatBytes(file.size)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-md border bg-card overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="text-left py-2 px-4 font-medium">Nombre</th>
                                        <th className="text-left py-2 px-4 font-medium">Tamaño</th>
                                        <th className="text-left py-2 px-4 font-medium hidden sm:table-cell">Tipo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredFiles.map((file) => (
                                        <tr
                                            key={file.path}
                                            className={cn(
                                                "border-b transition-colors hover:bg-muted/30 cursor-pointer",
                                                selectedPath === file.path && "bg-primary/5"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPath(file.path);
                                            }}
                                            onDoubleClick={() => handleDblClick(file)}
                                        >
                                            <td className="py-2 px-4 flex items-center gap-3">
                                                <div className="w-5 h-5 flex items-center justify-center">
                                                    {file.isFolder ? <Folder className="w-4 h-4 text-primary" /> : <File className="w-4 h-4 text-muted-foreground" />}
                                                </div>
                                                <span className="truncate max-w-[200px] sm:max-w-none font-medium">{file.name}</span>
                                            </td>
                                            <td className="py-2 px-4 text-muted-foreground">{file.isFolder ? "--" : formatBytes(file.size)}</td>
                                            <td className="py-2 px-4 text-muted-foreground hidden sm:table-cell">{file.isFolder ? "Carpeta" : file.mime.split('/')[1] || "Archivo"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
