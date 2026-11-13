-- =============================================================================
-- AJUNTAMENT DE SANTA EUGÈNIA (MALLORCA) - BRIGADA MUNICIPAL
-- Esquema de Base de Dades Supabase (PostgreSQL 15+)
-- Actualitzat amb Gestió Completa de Personal (Alta, Baixa i Modificació)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ENUMS I TIPUS DE DADES
-- -----------------------------------------------------------------------------
CREATE TYPE rol_usuari AS ENUM ('administrador', 'operari');

CREATE TYPE estat_tasca AS ENUM (
    'pendent',
    'assignada',
    'en_curs',
    'pendent_material',
    'finalitzada'
);

CREATE TYPE prioritat_tasca AS ENUM (
    'baixa',
    'normal',
    'alta',
    'urgent'
);

CREATE TYPE categoria_tasca AS ENUM (
    'electricitat',
    'fontaneria',
    'climatitzacio',
    'obra_albanileria',
    'peo_neteja',
    'paperes_residus',
    'jardineria',
    'senyalitzacio'
);

CREATE TYPE tipus_via AS ENUM (
    'carrer',
    'passatge',
    'placa',
    'cami',
    'carrero',
    'lloc',
    'disseminat',
    'avinguda',
    'poi'
);

-- -----------------------------------------------------------------------------
-- 2. TAULA DE NÚCLIS POBLACIONALS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nuclis (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE,
    codi_postal VARCHAR(5) DEFAULT '07142',
    latitud NUMERIC(10, 7) NOT NULL,
    longitud NUMERIC(10, 7) NOT NULL,
    actiu BOOLEAN DEFAULT TRUE,
    creat_el TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. NOMENCLÀTOR / CALLEJERO INTEGRAT (37 ENTRADES OFICIALS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vies_nomenclator (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    num_ordre INT,
    codi_municipal VARCHAR(10),
    codi_ine VARCHAR(10),
    nucli_id INT REFERENCES nuclis(id) ON DELETE RESTRICT,
    tipus tipus_via NOT NULL DEFAULT 'carrer',
    nom VARCHAR(150) NOT NULL,
    noms_alternatius TEXT,
    procedencia VARCHAR(100) DEFAULT 'Padró Municipal',
    descripcio_indicacio TEXT,
    latitud NUMERIC(10, 7),
    longitud NUMERIC(10, 7),
    actiu BOOLEAN DEFAULT TRUE,
    creat_el TIMESTAMPTZ DEFAULT NOW(),
    actualitzat_el TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. USUARIS I OPERARIS DE LA BRIGADA (ALTA, BAIXA I MODIFICACIÓ)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuaris_brigada (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_complet VARCHAR(100) NOT NULL,
    telefon VARCHAR(20) NOT NULL, -- Telèfon mòbil corporatiu obligatori per a avisos WhatsApp (https://wa.me/34TEL)
    carrec_rol VARCHAR(100) DEFAULT 'Operari de Manteniment',
    especialitat categoria_tasca NOT NULL DEFAULT 'peo_neteja',
    rol rol_usuari NOT NULL DEFAULT 'operari',
    pin_hash VARCHAR(255) NOT NULL,
    requereix_canvi_pin BOOLEAN DEFAULT FALSE,
    actiu BOOLEAN DEFAULT TRUE, -- Baixa lògica (FALSE = Baixa temporal/definitiva)
    data_baixa TIMESTAMPTZ,
    motiu_baixa TEXT,
    creat_el TIMESTAMPTZ DEFAULT NOW(),
    actualitzat_el TIMESTAMPTZ DEFAULT NOW(),
    darrer_acces TIMESTAMPTZ
);

-- Funció per a Alta d'Operari
CREATE OR REPLACE FUNCTION fn_alta_operari(
    p_nom VARCHAR,
    p_telefon VARCHAR,
    p_carrec VARCHAR,
    p_especialitat categoria_tasca,
    p_pin VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_nou_id UUID;
BEGIN
    INSERT INTO usuaris_brigada (
        nom_complet,
        telefon,
        carrec_rol,
        especialitat,
        rol,
        pin_hash,
        actiu
    ) VALUES (
        p_nom,
        p_telefon,
        p_carrec,
        p_especialitat,
        'operari',
        crypt(p_pin, gen_salt('bf')),
        TRUE
    ) RETURNING id INTO v_nou_id;
    
    RETURN v_nou_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funció per a Modificació d'Operari
CREATE OR REPLACE FUNCTION fn_modificar_operari(
    p_id UUID,
    p_nom VARCHAR,
    p_telefon VARCHAR,
    p_carrec VARCHAR,
    p_especialitat categoria_tasca
)
RETURNS VOID AS $$
BEGIN
    UPDATE usuaris_brigada
    SET
        nom_complet = p_nom,
        telefon = p_telefon,
        carrec_rol = p_carrec,
        especialitat = p_especialitat,
        actualitzat_el = NOW()
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funció per a Baixa o Reactivació d'Operari
CREATE OR REPLACE FUNCTION fn_canviar_estat_operari(
    p_id UUID,
    p_actiu BOOLEAN,
    p_motiu TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE usuaris_brigada
    SET
        actiu = p_actiu,
        data_baixa = CASE WHEN p_actiu = FALSE THEN NOW() ELSE NULL END,
        motiu_baixa = CASE WHEN p_actiu = FALSE THEN p_motiu ELSE NULL END,
        actualitzat_el = NOW()
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 5. TAULA DE TASQUES I HISTORIAL
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codi_incidencia VARCHAR(20) UNIQUE,
    titol VARCHAR(200) NOT NULL,
    descripcio TEXT,
    categoria categoria_tasca NOT NULL DEFAULT 'peo_neteja',
    prioritat prioritat_tasca NOT NULL DEFAULT 'normal',
    nucli_id INT REFERENCES nuclis(id) ON DELETE SET NULL,
    via_id UUID REFERENCES vies_nomenclator(id) ON DELETE SET NULL,
    adreca_especifica TEXT,
    latitud NUMERIC(10, 7) NOT NULL,
    longitud NUMERIC(10, 7) NOT NULL,
    estat estat_tasca NOT NULL DEFAULT 'pendent',
    operari_assignat_id UUID REFERENCES usuaris_brigada(id) ON DELETE SET NULL,
    es_important BOOLEAN NOT NULL DEFAULT FALSE,
    motiu_canvi_abast TEXT,
    historial_canvis JSONB DEFAULT '[]'::JSONB,
    temps_inici TIMESTAMPTZ,
    temps_finalitzacio TIMESTAMPTZ,
    temps_treballat_segons INT DEFAULT 0,
    pausa_esmorzar_aplicada BOOLEAN DEFAULT FALSE,
    motiu_pausa_material TEXT,
    foto_inicial_url TEXT,
    foto_final_url TEXT,
    fotos_purgades BOOLEAN DEFAULT FALSE,
    fotos_purgades_el TIMESTAMPTZ,
    signatura_digital_url TEXT,
    nom_signatari VARCHAR(100),
    dni_signatari VARCHAR(15),
    observacions_tancament TEXT,
    creat_el TIMESTAMPTZ DEFAULT NOW(),
    actualitzat_el TIMESTAMPTZ DEFAULT NOW()
);
