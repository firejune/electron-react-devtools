declare module "electron-react-devtools" {
    export function install(autoReload?: boolean): string;
    export function uninstall(): void;
    export var path:string;
}
