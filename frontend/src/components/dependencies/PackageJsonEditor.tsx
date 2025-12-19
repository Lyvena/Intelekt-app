import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Search,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useStore, useCurrentProjectFiles } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface Dependency {
  name: string;
  version: string;
  latestVersion?: string;
  isOutdated?: boolean;
  description?: string;
}

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface NpmPackageInfo {
  name: string;
  version: string;
  description: string;
  versions: string[];
}

const NPM_REGISTRY = 'https://registry.npmjs.org';

export const PackageJsonEditor: React.FC = () => {
  const { currentProject, setProjectFiles, projectFiles } = useStore();
  const files = useCurrentProjectFiles();
  
  const [packageJson, setPackageJson] = useState<PackageJson | null>(null);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [devDependencies, setDevDependencies] = useState<Dependency[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NpmPackageInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'deps' | 'devDeps' | 'add'>('deps');
  const [selectedVersions] = useState<Record<string, string>>({});

  // Load package.json from project files
  useEffect(() => {
    const pkgFile = files.find(f => f.path === 'package.json');
    if (pkgFile) {
      try {
        const parsed = JSON.parse(pkgFile.content);
        setPackageJson(parsed);
        
        // Parse dependencies
        const deps = Object.entries(parsed.dependencies || {}).map(([name, version]) => ({
          name,
          version: version as string,
        }));
        const devDeps = Object.entries(parsed.devDependencies || {}).map(([name, version]) => ({
          name,
          version: version as string,
        }));
        
        setDependencies(deps);
        setDevDependencies(devDeps);
      } catch (error) {
        console.error('Failed to parse package.json:', error);
      }
    }
  }, [files]);

  // Search npm registry
  const searchNpm = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${NPM_REGISTRY}/-/v1/search?text=${encodeURIComponent(query)}&size=10`
      );
      const data = await response.json();
      
      const results: NpmPackageInfo[] = data.objects.map((obj: { package: { name: string; version: string; description?: string } }) => ({
        name: obj.package.name,
        version: obj.package.version,
        description: obj.package.description || '',
        versions: [],
      }));
      
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search npm:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchNpm(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchNpm]);

  // Get package versions
  const getPackageVersions = async (packageName: string): Promise<string[]> => {
    try {
      const response = await fetch(`${NPM_REGISTRY}/${packageName}`);
      const data = await response.json();
      return Object.keys(data.versions || {}).reverse().slice(0, 20);
    } catch {
      return [];
    }
  };

  // Add dependency
  const addDependency = async (pkg: NpmPackageInfo, isDev: boolean = false) => {
    if (!currentProject || !packageJson) return;

    const version = selectedVersions[pkg.name] || `^${pkg.version}`;
    const newDep: Dependency = {
      name: pkg.name,
      version,
      description: pkg.description,
    };

    // Update state
    if (isDev) {
      setDevDependencies(prev => [...prev, newDep]);
    } else {
      setDependencies(prev => [...prev, newDep]);
    }

    // Update package.json
    const updatedPkgJson = { ...packageJson };
    if (isDev) {
      updatedPkgJson.devDependencies = {
        ...updatedPkgJson.devDependencies,
        [pkg.name]: version,
      };
    } else {
      updatedPkgJson.dependencies = {
        ...updatedPkgJson.dependencies,
        [pkg.name]: version,
      };
    }

    savePackageJson(updatedPkgJson);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Remove dependency
  const removeDependency = (name: string, isDev: boolean = false) => {
    if (!currentProject || !packageJson) return;

    // Update state
    if (isDev) {
      setDevDependencies(prev => prev.filter(d => d.name !== name));
    } else {
      setDependencies(prev => prev.filter(d => d.name !== name));
    }

    // Update package.json
    const updatedPkgJson = { ...packageJson };
    if (isDev) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [name]: _, ...rest } = updatedPkgJson.devDependencies || {};
      updatedPkgJson.devDependencies = rest;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [name]: _, ...rest } = updatedPkgJson.dependencies || {};
      updatedPkgJson.dependencies = rest;
    }

    savePackageJson(updatedPkgJson);
  };

  // Update dependency version
  const updateDependencyVersion = (name: string, newVersion: string, isDev: boolean = false) => {
    if (!currentProject || !packageJson) return;

    // Update state
    if (isDev) {
      setDevDependencies(prev =>
        prev.map(d => (d.name === name ? { ...d, version: newVersion } : d))
      );
    } else {
      setDependencies(prev =>
        prev.map(d => (d.name === name ? { ...d, version: newVersion } : d))
      );
    }

    // Update package.json
    const updatedPkgJson = { ...packageJson };
    if (isDev) {
      updatedPkgJson.devDependencies = {
        ...updatedPkgJson.devDependencies,
        [name]: newVersion,
      };
    } else {
      updatedPkgJson.dependencies = {
        ...updatedPkgJson.dependencies,
        [name]: newVersion,
      };
    }

    savePackageJson(updatedPkgJson);
  };

  // Save package.json to project files
  const savePackageJson = (pkgJson: PackageJson) => {
    if (!currentProject) return;

    const content = JSON.stringify(pkgJson, null, 2);
    const existingFiles = projectFiles[currentProject.id] || [];
    const fileExists = existingFiles.some(f => f.path === 'package.json');

    if (fileExists) {
      setProjectFiles(
        currentProject.id,
        existingFiles.map(f =>
          f.path === 'package.json' ? { ...f, content } : f
        )
      );
    } else {
      setProjectFiles(currentProject.id, [
        ...existingFiles,
        { path: 'package.json', content },
      ]);
    }

    setPackageJson(pkgJson);
  };

  // Check for outdated packages
  const checkOutdated = async () => {
    setIsUpdating(true);
    
    const checkDeps = async (deps: Dependency[]): Promise<Dependency[]> => {
      return Promise.all(
        deps.map(async (dep) => {
          try {
            const response = await fetch(`${NPM_REGISTRY}/${dep.name}/latest`);
            const data = await response.json();
            const currentVersion = dep.version.replace(/[\^~]/g, '');
            return {
              ...dep,
              latestVersion: data.version,
              isOutdated: currentVersion !== data.version,
            };
          } catch {
            return dep;
          }
        })
      );
    };

    const [updatedDeps, updatedDevDeps] = await Promise.all([
      checkDeps(dependencies),
      checkDeps(devDependencies),
    ]);

    setDependencies(updatedDeps);
    setDevDependencies(updatedDevDeps);
    setIsUpdating(false);
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Package className="w-8 h-8 opacity-50" />
      </div>
    );
  }

  if (!packageJson) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <Package className="w-12 h-12 opacity-50 mb-4" />
        <p className="text-sm mb-2">No package.json found</p>
        <button
          onClick={() => {
            const newPkgJson: PackageJson = {
              name: currentProject.name.toLowerCase().replace(/\s+/g, '-'),
              version: '1.0.0',
              dependencies: {},
              devDependencies: {},
            };
            savePackageJson(newPkgJson);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
        >
          Create package.json
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <span className="font-semibold">Package Manager</span>
        </div>
        <button
          onClick={checkOutdated}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isUpdating && "animate-spin")} />
          Check Updates
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Add Package Search */}
        <div className="space-y-2">
          <button
            onClick={() => setExpandedSection(expandedSection === 'add' ? 'deps' : 'add')}
            className="flex items-center justify-between w-full px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Add Package</span>
            </div>
            {expandedSection === 'add' ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expandedSection === 'add' && (
            <div className="space-y-3 pl-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search npm packages..."
                  className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-60 overflow-auto">
                  {searchResults.map((pkg) => (
                    <div
                      key={pkg.name}
                      className="flex items-center justify-between p-2 bg-card hover:bg-secondary/50 rounded-lg group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{pkg.name}</span>
                          <span className="text-xs text-muted-foreground">v{pkg.version}</span>
                        </div>
                        {pkg.description && (
                          <p className="text-xs text-muted-foreground truncate">{pkg.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => addDependency(pkg, false)}
                          className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90"
                          title="Add as dependency"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => addDependency(pkg, true)}
                          className="px-2 py-1 bg-secondary text-xs rounded hover:bg-secondary/80"
                          title="Add as dev dependency"
                        >
                          Dev
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dependencies */}
        <DependencySection
          title="Dependencies"
          icon={Package}
          dependencies={dependencies}
          isExpanded={expandedSection === 'deps'}
          onToggle={() => setExpandedSection(expandedSection === 'deps' ? 'add' : 'deps')}
          onRemove={(name) => removeDependency(name, false)}
          onUpdateVersion={(name, version) => updateDependencyVersion(name, version, false)}
          getVersions={getPackageVersions}
        />

        {/* Dev Dependencies */}
        <DependencySection
          title="Dev Dependencies"
          icon={Package}
          dependencies={devDependencies}
          isExpanded={expandedSection === 'devDeps'}
          onToggle={() => setExpandedSection(expandedSection === 'devDeps' ? 'add' : 'devDeps')}
          onRemove={(name) => removeDependency(name, true)}
          onUpdateVersion={(name, version) => updateDependencyVersion(name, version, true)}
          getVersions={getPackageVersions}
          isDev
        />
      </div>
    </div>
  );
};

// Dependency Section Component
interface DependencySectionProps {
  title: string;
  icon: React.ElementType;
  dependencies: Dependency[];
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: (name: string) => void;
  onUpdateVersion: (name: string, version: string) => void;
  getVersions: (name: string) => Promise<string[]>;
  isDev?: boolean;
}

const DependencySection: React.FC<DependencySectionProps> = ({
  title,
  icon: Icon,
  dependencies,
  isExpanded,
  onToggle,
  onRemove,
  onUpdateVersion,
  getVersions,
  isDev,
}) => {
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, string[]>>({});
  const [loadingVersions, setLoadingVersions] = useState<string | null>(null);

  const loadVersions = async (pkgName: string) => {
    if (versions[pkgName]) return;
    
    setLoadingVersions(pkgName);
    const pkgVersions = await getVersions(pkgName);
    setVersions(prev => ({ ...prev, [pkgName]: pkgVersions }));
    setLoadingVersions(null);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors",
          isDev ? "bg-orange-500/10 hover:bg-orange-500/20" : "bg-blue-500/10 hover:bg-blue-500/20"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", isDev ? "text-orange-500" : "text-blue-500")} />
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">({dependencies.length})</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded && dependencies.length > 0 && (
        <div className="space-y-1 pl-2">
          {dependencies.map((dep) => (
            <div
              key={dep.name}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-secondary/30"
                onClick={() => {
                  setExpandedPkg(expandedPkg === dep.name ? null : dep.name);
                  loadVersions(dep.name);
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{dep.name}</span>
                  <span className="text-xs text-muted-foreground">{dep.version}</span>
                  {dep.isOutdated && (
                    <span className="flex items-center gap-1 text-xs text-yellow-500">
                      <AlertCircle className="w-3 h-3" />
                      {dep.latestVersion}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`https://www.npmjs.com/package/${dep.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 hover:bg-secondary rounded"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(dep.name);
                    }}
                    className="p-1 hover:bg-destructive/10 rounded text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {expandedPkg === dep.name && (
                <div className="px-3 py-2 border-t border-border bg-secondary/20">
                  <label className="text-xs text-muted-foreground mb-1 block">Version</label>
                  {loadingVersions === dep.name ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading versions...
                    </div>
                  ) : (
                    <select
                      value={dep.version}
                      onChange={(e) => onUpdateVersion(dep.name, e.target.value)}
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                    >
                      <option value={dep.version}>{dep.version}</option>
                      {versions[dep.name]?.map((v) => (
                        <option key={v} value={`^${v}`}>
                          ^{v}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isExpanded && dependencies.length === 0 && (
        <p className="text-xs text-muted-foreground pl-6">No {isDev ? 'dev ' : ''}dependencies</p>
      )}
    </div>
  );
};

export default PackageJsonEditor;
