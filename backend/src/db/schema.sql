-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, parent_id, name) WHERE is_deleted = FALSE
);

CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_deleted ON folders(is_deleted, deleted_at);
CREATE INDEX idx_folders_name_trgm ON folders USING gin(name gin_trgm_ops);

-- Files table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    storage_bucket VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255),
    size BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'ready', -- uploading, ready, processing, error
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_files_deleted ON files(is_deleted, deleted_at);
CREATE INDEX idx_files_name_trgm ON files USING gin(name gin_trgm_ops);
CREATE INDEX idx_files_status ON files(status);

-- File versions table
CREATE TABLE IF NOT EXISTS file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    storage_bucket VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(file_id, version_number)
);

CREATE INDEX idx_file_versions_file_id ON file_versions(file_id);

-- Shares table (user-to-user sharing)
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL DEFAULT 'viewer', -- viewer, editor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK ((file_id IS NOT NULL AND folder_id IS NULL) OR (file_id IS NULL AND folder_id IS NOT NULL)),
    UNIQUE(file_id, shared_with_id) WHERE file_id IS NOT NULL,
    UNIQUE(folder_id, shared_with_id) WHERE folder_id IS NOT NULL
);

CREATE INDEX idx_shares_owner_id ON shares(owner_id);
CREATE INDEX idx_shares_shared_with_id ON shares(shared_with_id);
CREATE INDEX idx_shares_file_id ON shares(file_id);
CREATE INDEX idx_shares_folder_id ON shares(folder_id);

-- Link shares table (public sharing)
CREATE TABLE IF NOT EXISTS link_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    max_access_count INTEGER,
    access_count INTEGER DEFAULT 0,
    permission VARCHAR(20) NOT NULL DEFAULT 'viewer', -- viewer, editor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK ((file_id IS NOT NULL AND folder_id IS NULL) OR (file_id IS NULL AND folder_id IS NOT NULL))
);

CREATE INDEX idx_link_shares_token ON link_shares(token);
CREATE INDEX idx_link_shares_owner_id ON link_shares(owner_id);
CREATE INDEX idx_link_shares_file_id ON link_shares(file_id);
CREATE INDEX idx_link_shares_folder_id ON link_shares(folder_id);

-- Stars table
CREATE TABLE IF NOT EXISTS stars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK ((file_id IS NOT NULL AND folder_id IS NULL) OR (file_id IS NULL AND folder_id IS NOT NULL)),
    UNIQUE(user_id, file_id) WHERE file_id IS NOT NULL,
    UNIQUE(user_id, folder_id) WHERE folder_id IS NOT NULL
);

CREATE INDEX idx_stars_user_id ON stars(user_id);
CREATE INDEX idx_stars_file_id ON stars(file_id);
CREATE INDEX idx_stars_folder_id ON stars(folder_id);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- upload, download, share, delete, rename, move
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_file_id ON activities(file_id);
CREATE INDEX idx_activities_folder_id ON activities(folder_id);

-- Function to prevent folder cycles
CREATE OR REPLACE FUNCTION check_folder_cycle()
RETURNS TRIGGER AS $$
DECLARE
    current_parent_id UUID;
BEGIN
    current_parent_id := NEW.parent_id;
    
    -- Check if new parent_id creates a cycle
    WHILE current_parent_id IS NOT NULL LOOP
        IF current_parent_id = NEW.id THEN
            RAISE EXCEPTION 'Cannot create folder cycle';
        END IF;
        SELECT parent_id INTO current_parent_id FROM folders WHERE id = current_parent_id;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_folder_cycle
    BEFORE INSERT OR UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION check_folder_cycle();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shares_updated_at BEFORE UPDATE ON shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_link_shares_updated_at BEFORE UPDATE ON link_shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
