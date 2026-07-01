/** Примитивный или именованный тип в манифесте плагина. */
export type ManifestTypeRef = string;

export interface ManifestMethod {
  args?: Record<string, ManifestTypeRef> | ManifestTypeRef;
  result?: ManifestTypeRef;
  stream?: boolean;
}

export interface ManifestError {
  message: string;
  description?: string;
}

export interface ManifestEvent {
  [field: string]: ManifestTypeRef;
}

export interface EngineCompat {
  runtime: string;
  bridgeProtocol: number;
}

export interface AuroraCompat {
  minOs?: string;
  engines?: string[];
}

export interface NativeDeps {
  rpm?: string[];
  qt?: string[];
}

export interface PluginManifest {
  manifestVersion: number;
  name: string;
  display: string;
  version: string;
  engineCompat: EngineCompat;
  auroraCompat?: AuroraCompat;
  permissions?: string[];
  scopes?: string[];
  nativeDeps?: NativeDeps;
  types?: Record<string, Record<string, ManifestTypeRef>>;
  methods: Record<string, ManifestMethod>;
  events?: Record<string, ManifestEvent>;
  errors?: Record<string, ManifestError>;
}

export interface ManifestValidationError {
  path: string;
  message: string;
}
