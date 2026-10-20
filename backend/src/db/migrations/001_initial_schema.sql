-- 001_initial_schema.sql
-- Initial database schema for Skribbl.io clone

-- 1. Table: rooms
CREATE TABLE IF NOT EXISTS rooms (
    room_id VARCHAR(10) NOT NULL,
    room_name VARCHAR(64) NOT NULL DEFAULT 'Skribbl Room',
    host_name VARCHAR(64) NOT NULL,
    max_players INT NOT NULL DEFAULT 8,
    total_rounds INT NOT NULL DEFAULT 3,
    draw_time_seconds INT NOT NULL DEFAULT 80,
    word_options_count INT NOT NULL DEFAULT 3,
    hints_allowed INT NOT NULL DEFAULT 2,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('LOBBY', 'PLAYING', 'FINISHED', 'ABANDONED') NOT NULL DEFAULT 'LOBBY',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id),
    INDEX idx_rooms_status (status),
    INDEX idx_rooms_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: players
CREATE TABLE IF NOT EXISTS players (
    player_id VARCHAR(36) NOT NULL,
    room_id VARCHAR(10) NOT NULL,
    player_name VARCHAR(64) NOT NULL,
    avatar_id VARCHAR(32) NOT NULL DEFAULT 'avatar_1',
    is_host BOOLEAN NOT NULL DEFAULT FALSE,
    total_score INT NOT NULL DEFAULT 0,
    is_connected BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id),
    CONSTRAINT fk_players_room FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
    INDEX idx_players_room (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: game_sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    session_id VARCHAR(36) NOT NULL,
    room_id VARCHAR(10) NOT NULL,
    winner_player_id VARCHAR(36) NULL,
    total_rounds_played INT NOT NULL DEFAULT 0,
    status ENUM('IN_PROGRESS', 'COMPLETED', 'ABORTED') NOT NULL DEFAULT 'IN_PROGRESS',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    PRIMARY KEY (session_id),
    CONSTRAINT fk_sessions_room FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_winner FOREIGN KEY (winner_player_id) REFERENCES players(player_id) ON DELETE SET NULL,
    INDEX idx_sessions_room (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: words
CREATE TABLE IF NOT EXISTS words (
    word_id INT AUTO_INCREMENT NOT NULL,
    word VARCHAR(64) NOT NULL UNIQUE,
    category ENUM('ANIMALS', 'OBJECTS', 'ACTIONS', 'FOOD', 'PLACES', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
    difficulty ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'EASY',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    PRIMARY KEY (word_id),
    INDEX idx_words_category (category),
    INDEX idx_words_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: game_rounds
CREATE TABLE IF NOT EXISTS game_rounds (
    round_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    round_number INT NOT NULL,
    turn_number INT NOT NULL,
    drawer_player_id VARCHAR(36) NOT NULL,
    word_id INT NULL,
    secret_word VARCHAR(64) NOT NULL,
    time_allocated INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    PRIMARY KEY (round_id),
    CONSTRAINT fk_rounds_session FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_rounds_drawer FOREIGN KEY (drawer_player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    CONSTRAINT fk_rounds_word FOREIGN KEY (word_id) REFERENCES words(word_id) ON DELETE SET NULL,
    INDEX idx_rounds_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table: player_round_scores
CREATE TABLE IF NOT EXISTS player_round_scores (
    score_id VARCHAR(36) NOT NULL,
    round_id VARCHAR(36) NOT NULL,
    player_id VARCHAR(36) NOT NULL,
    guessed_correctly BOOLEAN NOT NULL DEFAULT FALSE,
    guess_time_seconds INT NULL,
    score_awarded INT NOT NULL DEFAULT 0,
    is_drawer BOOLEAN NOT NULL DEFAULT FALSE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (score_id),
    CONSTRAINT fk_scores_round FOREIGN KEY (round_id) REFERENCES game_rounds(round_id) ON DELETE CASCADE,
    CONSTRAINT fk_scores_player FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    INDEX idx_scores_round (round_id),
    INDEX idx_scores_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Words
INSERT IGNORE INTO words (word, category, difficulty) VALUES
('cat', 'ANIMALS', 'EASY'),
('dog', 'ANIMALS', 'EASY'),
('elephant', 'ANIMALS', 'MEDIUM'),
('giraffe', 'ANIMALS', 'MEDIUM'),
('penguin', 'ANIMALS', 'EASY'),
('lion', 'ANIMALS', 'EASY'),
('dolphin', 'ANIMALS', 'MEDIUM'),
('guitar', 'OBJECTS', 'EASY'),
('airplane', 'OBJECTS', 'EASY'),
('rocket', 'OBJECTS', 'MEDIUM'),
('computer', 'OBJECTS', 'EASY'),
('bicycle', 'OBJECTS', 'EASY'),
('clock', 'OBJECTS', 'EASY'),
('pizza', 'FOOD', 'EASY'),
('burger', 'FOOD', 'EASY'),
('ice cream', 'FOOD', 'EASY'),
('banana', 'FOOD', 'EASY'),
('castle', 'PLACES', 'MEDIUM'),
('pyramid', 'PLACES', 'MEDIUM'),
('beach', 'PLACES', 'EASY'),
('hospital', 'PLACES', 'MEDIUM'),
('swimming', 'ACTIONS', 'MEDIUM'),
('dancing', 'ACTIONS', 'MEDIUM'),
('sleeping', 'ACTIONS', 'EASY'),
('flying', 'ACTIONS', 'MEDIUM');
