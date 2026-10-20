"""
generate_pdf.py
Builds the comprehensive 'architecture-and-database.pdf' for the Skribbl.io Clone project.
Covers:
  1. Project Overview & Multiplayer Walkthrough
  2. Technology Stack & Comparison with Spring Boot
  3. High-Level System Architecture & Vector Diagram
  4. Complete Game Workflow Flowchart
  5. Relational Database Design & Detailed Tables
  6. Visual ER Diagram
  7. Socket.IO Protocol Specification & Events
  8. Live In-Memory State vs MySQL Persistence & OOP Engine
  9. Codebase Architecture & Directory Structure
  10. Deployment Architecture (Local Docker + Cloud)
  11. Technical Interview Questions & Answers
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import (
    Drawing, Rect, String, Line
)

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Top banner on all pages except cover/first page
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#1A365D"))
            self.drawString(54, 755, "SKRIBBL.IO CLONE")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#4A5568"))
            self.drawString(145, 755, "|  Full-Stack Architecture & Database Specification")
            self.setStrokeColor(colors.HexColor("#CBD5E0"))
            self.setLineWidth(0.75)
            self.line(54, 747, 558, 747)

        # Bottom footer on all pages
        self.setStrokeColor(colors.HexColor("#CBD5E0"))
        self.setLineWidth(0.75)
        self.line(54, 45, 558, 45)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#718096"))
        self.drawString(54, 32, "Real-Time Multiplayer Drawing & Guessing Game — Phase 0 Architecture")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()


def create_architecture_diagram():
    """Draws vector architecture diagram: Client -> Socket/HTTP -> Node.js OOP -> Memory & MySQL."""
    d = Drawing(504, 185)
    
    # Background Canvas
    d.add(Rect(0, 0, 504, 185, fillColor=colors.HexColor("#F8FAFC"), strokeColor=colors.HexColor("#E2E8F0"), rx=6, ry=6))
    
    # 1. Frontend Box
    d.add(Rect(15, 20, 140, 145, fillColor=colors.HexColor("#EBF8FF"), strokeColor=colors.HexColor("#3182CE"), strokeWidth=1.5, rx=4, ry=4))
    d.add(String(25, 145, "FRONTEND CLIENT", fontName="Helvetica-Bold", fontSize=9, fillColor=colors.HexColor("#2B6CB0")))
    d.add(String(25, 130, "(React 18 + TS + Vite)", fontName="Helvetica", fontSize=8, fillColor=colors.HexColor("#4A5568")))
    d.add(Rect(25, 90, 120, 32, fillColor=colors.white, strokeColor=colors.HexColor("#BEE3F8"), rx=3, ry=3))
    d.add(String(32, 108, "HTML5 Canvas", fontName="Helvetica-Bold", fontSize=8, fillColor=colors.HexColor("#2C5282")))
    d.add(String(32, 96, "Vector 2D Path Engine", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#718096")))
    d.add(Rect(25, 35, 120, 48, fillColor=colors.white, strokeColor=colors.HexColor("#BEE3F8"), rx=3, ry=3))
    d.add(String(32, 68, "UI & State Views", fontName="Helvetica-Bold", fontSize=8, fillColor=colors.HexColor("#2C5282")))
    d.add(String(32, 56, "• Room & Lobby", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#4A5568")))
    d.add(String(32, 44, "• Chat, Guess & Leaderboard", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#4A5568")))

    # Connecting Arrows (Bi-directional)
    d.add(Line(155, 110, 195, 110, strokeColor=colors.HexColor("#319795"), strokeWidth=2))
    d.add(Line(155, 60, 195, 60, strokeColor=colors.HexColor("#3182CE"), strokeWidth=2))
    d.add(String(160, 116, "WS / WSS", fontName="Helvetica-Bold", fontSize=7, fillColor=colors.HexColor("#234E52")))
    d.add(String(160, 66, "REST API", fontName="Helvetica-Bold", fontSize=7, fillColor=colors.HexColor("#2A4365")))

    # 2. Backend Box
    d.add(Rect(195, 20, 160, 145, fillColor=colors.HexColor("#F0FFF4"), strokeColor=colors.HexColor("#38A169"), strokeWidth=1.5, rx=4, ry=4))
    d.add(String(205, 145, "BACKEND ENGINE", fontName="Helvetica-Bold", fontSize=9, fillColor=colors.HexColor("#276749")))
    d.add(String(205, 130, "(Node.js + Express + Socket.IO)", fontName="Helvetica", fontSize=8, fillColor=colors.HexColor("#4A5568")))
    d.add(Rect(205, 80, 140, 42, fillColor=colors.white, strokeColor=colors.HexColor("#C6F6D5"), rx=3, ry=3))
    d.add(String(212, 108, "OOP Game Engine", fontName="Helvetica-Bold", fontSize=8, fillColor=colors.HexColor("#22543D")))
    d.add(String(212, 96, "• Room & Player Models", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#4A5568")))
    d.add(String(212, 85, "• Game State & Round Turns", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#4A5568")))
    d.add(Rect(205, 30, 140, 42, fillColor=colors.white, strokeColor=colors.HexColor("#C6F6D5"), rx=3, ry=3))
    d.add(String(212, 58, "Authoritative Services", fontName="Helvetica-Bold", fontSize=8, fillColor=colors.HexColor("#22543D")))
    d.add(String(212, 46, "• Timers & Word Masking", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#4A5568")))
    d.add(String(212, 35, "• Scoring & Guess Verifier", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#4A5568")))

    # Connecting Arrows from Backend to Data Layer
    d.add(Line(355, 120, 385, 135, strokeColor=colors.HexColor("#DD6B20"), strokeWidth=2))
    d.add(Line(355, 60, 385, 45, strokeColor=colors.HexColor("#805AD5"), strokeWidth=2))

    # 3. Data Tier (In-Memory & MySQL)
    # Memory Box
    d.add(Rect(385, 100, 105, 65, fillColor=colors.HexColor("#FFFAF0"), strokeColor=colors.HexColor("#DD6B20"), strokeWidth=1.5, rx=4, ry=4))
    d.add(String(392, 150, "IN-MEMORY RAM", fontName="Helvetica-Bold", fontSize=8, fillColor=colors.HexColor("#C05621")))
    d.add(String(392, 137, "• Active Sockets", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#7B341E")))
    d.add(String(392, 125, "• Stroke Coordinates", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#7B341E")))
    d.add(String(392, 113, "• Round Deadlines", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#7B341E")))
    d.add(String(392, 103, "• Live Room Roster", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#7B341E")))

    # MySQL Box
    d.add(Rect(385, 15, 105, 75, fillColor=colors.HexColor("#FAF5FF"), strokeColor=colors.HexColor("#805AD5"), strokeWidth=1.5, rx=4, ry=4))
    d.add(String(392, 77, "DOCKER MYSQL 8.0", fontName="Helvetica-Bold", fontSize=8, fillColor=colors.HexColor("#6B46C1")))
    d.add(String(392, 65, "• Rooms & Settings", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#553C9A")))
    d.add(String(392, 53, "• Players & Totals", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#553C9A")))
    d.add(String(392, 41, "• Game Sessions", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#553C9A")))
    d.add(String(392, 29, "• Round Summaries", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#553C9A")))
    d.add(String(392, 18, "• Player Round Scores", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#553C9A")))

    return d


def create_game_workflow_diagram():
    """Draws visual workflow flowchart: Create -> Join -> Lobby -> Select Drawer -> Word -> Draw/Guess -> Score -> Game Over."""
    d = Drawing(504, 150)
    d.add(Rect(0, 0, 504, 150, fillColor=colors.HexColor("#F7FAFC"), strokeColor=colors.HexColor("#E2E8F0"), rx=6, ry=6))

    steps_row1 = [
        ("1. Create Room", "Host sets rules", colors.HexColor("#3182CE")),
        ("2. Join & Lobby", "Players enter code", colors.HexColor("#319795")),
        ("3. Start Game", "Host triggers match", colors.HexColor("#38A169")),
        ("4. Pick Word", "Drawer picks 1 of 3", colors.HexColor("#D69E2E"))
    ]
    
    for idx, (title, sub, color) in enumerate(steps_row1):
        x = 15 + idx * 122
        y = 85
        d.add(Rect(x, y, 108, 48, fillColor=colors.white, strokeColor=color, strokeWidth=1.5, rx=4, ry=4))
        d.add(String(x + 8, y + 32, title, fontName="Helvetica-Bold", fontSize=8, fillColor=color))
        d.add(String(x + 8, y + 16, sub, fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#4A5568")))
        if idx < 3:
            d.add(Line(x + 108, y + 24, x + 122, y + 24, strokeColor=colors.HexColor("#A0AEC0"), strokeWidth=1.5))

    # Connecting arrow down from row 1 to row 2
    d.add(Line(490, 85, 490, 60, strokeColor=colors.HexColor("#A0AEC0"), strokeWidth=1.5))
    d.add(Line(490, 60, 485, 60, strokeColor=colors.HexColor("#A0AEC0"), strokeWidth=1.5))

    steps_row2 = [
        ("8. Game Over", "Podium & Final Rank", colors.HexColor("#E53E3E")),
        ("7. Next Turn", "Rotate Drawer Queue", colors.HexColor("#805AD5")),
        ("6. Round End", "Scores to MySQL", colors.HexColor("#DD6B20")),
        ("5. Draw & Guess", "Real-Time Sync (60s)", colors.HexColor("#319795"))
    ]

    for idx, (title, sub, color) in enumerate(steps_row2):
        x = 381 - idx * 122
        y = 15
        d.add(Rect(x, y, 108, 48, fillColor=colors.white, strokeColor=color, strokeWidth=1.5, rx=4, ry=4))
        d.add(String(x + 8, y + 32, title, fontName="Helvetica-Bold", fontSize=8, fillColor=color))
        d.add(String(x + 8, y + 16, sub, fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#4A5568")))
        if idx < 3:
            d.add(Line(x, y + 24, x - 14, y + 24, strokeColor=colors.HexColor("#A0AEC0"), strokeWidth=1.5))

    return d


def create_er_diagram():
    """Draws visual Entity-Relationship diagram connecting the 6 database tables."""
    d = Drawing(504, 175)
    d.add(Rect(0, 0, 504, 175, fillColor=colors.HexColor("#F8FAFC"), strokeColor=colors.HexColor("#E2E8F0"), rx=6, ry=6))

    tables = [
        ("ROOMS", 15, 105, 105, 55, [("room_id (PK)", True), ("host_name", False), ("max_players", False), ("status", False)], colors.HexColor("#2B6CB0")),
        ("PLAYERS", 150, 105, 105, 55, [("player_id (PK)", True), ("room_id (FK)", True), ("player_name", False), ("total_score", False)], colors.HexColor("#2F855A")),
        ("GAME_SESSIONS", 285, 105, 105, 55, [("session_id (PK)", True), ("room_id (FK)", True), ("winner_id (FK)", True), ("status", False)], colors.HexColor("#C05621")),
        ("WORDS", 405, 105, 85, 55, [("word_id (PK)", True), ("word", False), ("category", False), ("difficulty", False)], colors.HexColor("#4C51BF")),
        ("GAME_ROUNDS", 150, 15, 115, 55, [("round_id (PK)", True), ("session_id (FK)", True), ("drawer_id (FK)", True), ("secret_word", False)], colors.HexColor("#B7791F")),
        ("ROUND_SCORES", 285, 15, 115, 55, [("score_id (PK)", True), ("round_id (FK)", True), ("player_id (FK)", True), ("score_awarded", False)], colors.HexColor("#97266D"))
    ]

    for title, x, y, w, h, cols, border_col in tables:
        d.add(Rect(x, y, w, h, fillColor=colors.white, strokeColor=border_col, strokeWidth=1.5, rx=3, ry=3))
        d.add(Rect(x, y + h - 14, w, 14, fillColor=border_col, strokeColor=border_col, rx=2, ry=2))
        d.add(String(x + 5, y + h - 10, title, fontName="Helvetica-Bold", fontSize=7, fillColor=colors.white))
        
        for c_idx, (col_name, is_key) in enumerate(cols):
            cy = y + h - 23 - (c_idx * 9)
            fn = "Helvetica-Bold" if is_key else "Helvetica"
            fc = colors.HexColor("#1A202C") if is_key else colors.HexColor("#718096")
            d.add(String(x + 5, cy, col_name, fontName=fn, fontSize=6, fillColor=fc))

    # Connection lines showing foreign keys
    # ROOMS -> PLAYERS (1:N)
    d.add(Line(120, 132, 150, 132, strokeColor=colors.HexColor("#4A5568"), strokeWidth=1))
    d.add(String(125, 136, "1:N", fontName="Helvetica", fontSize=6, fillColor=colors.HexColor("#718096")))

    # ROOMS -> GAME_SESSIONS (1:N)
    d.add(Line(67, 105, 67, 85, strokeColor=colors.HexColor("#4A5568"), strokeWidth=1))
    d.add(Line(67, 85, 337, 85, strokeColor=colors.HexColor("#4A5568"), strokeWidth=1))
    d.add(Line(337, 85, 337, 105, strokeColor=colors.HexColor("#4A5568"), strokeWidth=1))

    # GAME_SESSIONS -> GAME_ROUNDS (1:N)
    d.add(Line(337, 105, 337, 75, strokeColor=colors.HexColor("#4A5568"), strokeWidth=1))
    d.add(Line(337, 75, 207, 75, strokeColor=colors.HexColor("#4A5568"), strokeWidth=1))
    d.add(Line(207, 75, 207, 70, strokeColor=colors.HexColor("#4A5568"), strokeWidth=1))

    # GAME_ROUNDS -> ROUND_SCORES (1:N)
    d.add(Line(265, 42, 285, 42, strokeColor=colors.HexColor("#4A5568"), strokeWidth=1))
    d.add(String(268, 46, "1:N", fontName="Helvetica", fontSize=6, fillColor=colors.HexColor("#718096")))

    # WORDS -> GAME_ROUNDS (1:N)
    d.add(Line(447, 105, 447, 42, strokeColor=colors.HexColor("#4A5568"), strokeWidth=1))
    d.add(Line(447, 42, 400, 42, strokeColor=colors.HexColor("#4A5568"), strokeWidth=1))

    return d


def generate_pdf(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    primary_color = colors.HexColor("#1A365D")
    secondary_color = colors.HexColor("#2B6CB0")
    dark_neutral = colors.HexColor("#2D3748")
    light_bg = colors.HexColor("#F7FAFC")
    border_color = colors.HexColor("#CBD5E0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=secondary_color,
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=secondary_color,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=dark_neutral,
        spaceAfter=5
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=dark_neutral
    )

    table_cell_code = ParagraphStyle(
        'TableCellCode',
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#97266D")
    )

    story = []

    # ==================== PAGE 1 ====================
    story.append(Paragraph("SKRIBBL.IO CLONE", title_style))
    story.append(Paragraph("Full-Stack System Architecture, Real-Time Protocol & Database Design Specification", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=0, spaceAfter=8))

    meta_data = [
        [
            Paragraph("<b>Role:</b> Senior Full-Stack Architect & Coach", body_style),
            Paragraph("<b>Technology:</b> React, Node.js, Socket.IO, MySQL, Docker", body_style)
        ],
        [
            Paragraph("<b>Target:</b> Final Technical Interview Round", body_style),
            Paragraph("<b>Document Status:</b> Phase 0 Approved Baseline", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[240, 264])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EDF2F7")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("1. Project Overview & Multiplayer Walkthrough", h1_style))
    story.append(Paragraph(
        "The project is an interactive, full-stack multiplayer clone of the beloved web game <b>skribbl.io</b>. "
        "Players gather in virtual rooms where they take turns drawing secret words on an HTML5 canvas while other players "
        "race to guess the word in a real-time chat feed. The backend acts as the authoritative arbitrator of game state, "
        "managing turns, timers, word masking, score computation, and broadcast routing.",
        body_style
    ))
    
    story.append(Paragraph("Core Application Screens & User Flow:", h2_style))
    screens_data = [
        [Paragraph("Screen / View", table_header_style), Paragraph("User Purpose", table_header_style), Paragraph("Key Technical Interactions", table_header_style)],
        [Paragraph("<b>Create Room View</b>", table_cell_style), Paragraph("Host enters nickname, sets max players (2-20), rounds (2-10), draw time (15-240s), hints count.", table_cell_style), Paragraph("Emits <code>create_room</code>; backend persists room record in MySQL & allocates in-memory Room.", table_cell_style)],
        [Paragraph("<b>Lobby View</b>", table_cell_style), Paragraph("Participants view joined roster, avatars, host badge, and invite link. Host clicks 'Start Game'.", table_cell_style), Paragraph("Listens to <code>player_joined</code>, <code>player_left</code>. Only host socket can emit <code>start_game</code>.", table_cell_style)],
        [Paragraph("<b>Active Game View</b>", table_cell_style), Paragraph("Drawer selects word and draws; guessers view live strokes, masked blanks, and submit guesses in chat.", table_cell_style), Paragraph("Streams normalized vector strokes via <code>draw_data</code>; backend authoritatively runs timer & scores.", table_cell_style)],
        [Paragraph("<b>Round End View</b>", table_cell_style), Paragraph("Reveals secret word, awards points to solvers and drawer, displays updated rankings.", table_cell_style), Paragraph("Server flushes round scores to MySQL; triggers next drawer or initiates game conclusion.", table_cell_style)],
        [Paragraph("<b>Podium / Game Over</b>", table_cell_style), Paragraph("Celebrates 1st, 2nd, and 3rd place winners with final match stats and 'Play Again' button.", table_cell_style), Paragraph("Marks <code>game_sessions.status = 'COMPLETED'</code>; archives match records in database.", table_cell_style)]
    ]
    t_screens = Table(screens_data, colWidths=[95, 195, 214])
    t_screens.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_screens)
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        "<b>Multiplayer Example Walkthrough (Alice, Bob, Charlie, Dana):</b><br/>"
        "Alice creates room <code>SKR-482</code> with 60s draw time. Bob, Charlie, and Dana join via link. Alice clicks 'Start Game'. "
        "Alice is designated Drawer for Round 1. The server generates 3 choices: <i>['Rocket', 'Castle', 'Guitar']</i> and emits them <b>only to Alice</b>. "
        "Bob, Charlie, and Dana receive masked blanks: <code>_ _ _ _ _ _</code> (6 letters). Alice chooses 'Rocket'. "
        "When Alice draws, coordinates are streamed across Socket.IO. Bob guesses 'Airplane' (fails, visible in chat). "
        "Charlie guesses 'Rocket' (correct!). Charlie earns 450 points; Alice receives 100 drawer points. Bob and Dana see: <i>'Charlie guessed the word!'</i> "
        "without the word being leaked. When time expires, scores persist to MySQL, and Bob becomes the next drawer.",
        body_style
    ))

    # ==================== PAGE 2 ====================
    story.append(PageBreak())
    story.append(Paragraph("2. Technology Stack & Comparison with Java / Spring Boot", h1_style))
    story.append(Paragraph(
        "As a developer with a solid foundation in Java, Spring Boot, OOP, and relational SQL, understanding how the chosen "
        "JavaScript/TypeScript stack maps to familiar enterprise patterns is essential for confident interview explanations.",
        body_style
    ))

    stack_data = [
        [Paragraph("Layer", table_header_style), Paragraph("Chosen Technology", table_header_style), Paragraph("Architectural Purpose", table_header_style), Paragraph("Java / Spring Boot Equivalent", table_header_style)],
        [Paragraph("<b>Frontend SPA</b>", table_cell_style), Paragraph("React 18 + TS + Vite", table_cell_style), Paragraph("Reactive component UI, type-safety, instant HMR", table_cell_style), Paragraph("React / Thymeleaf frontend integration", table_cell_style)],
        [Paragraph("<b>Canvas Layer</b>", table_cell_style), Paragraph("HTML5 Canvas 2D API", table_cell_style), Paragraph("Direct pixel manipulation, zero library overhead", table_cell_style), Paragraph("JavaFX / Swing <code>Graphics2D</code> drawing", table_cell_style)],
        [Paragraph("<b>Backend Server</b>", table_cell_style), Paragraph("Node.js + Express.js", table_cell_style), Paragraph("Event-loop I/O, REST endpoints, static asset server", table_cell_style), Paragraph("Spring Boot MVC (<code>@RestController</code>)", table_cell_style)],
        [Paragraph("<b>Real-Time Engine</b>", table_cell_style), Paragraph("Socket.IO v4", table_cell_style), Paragraph("Bi-directional event pub/sub with WebSocket transport", table_cell_style), Paragraph("Spring WebSocket + STOMP (<code>SimpMessagingTemplate</code>)", table_cell_style)],
        [Paragraph("<b>Relational DB</b>", table_cell_style), Paragraph("MySQL 8.0 (Docker)", table_cell_style), Paragraph("ACID transactions, structured audit of matches & scores", table_cell_style), Paragraph("MySQL / PostgreSQL with Spring Data JPA & Hibernate", table_cell_style)],
        [Paragraph("<b>DB Connectivity</b>", table_cell_style), Paragraph("mysql2 Connection Pool", table_cell_style), Paragraph("Prepared statements, parameterized queries, pooling", table_cell_style), Paragraph("HikariCP connection pool + JdbcTemplate / JPA", table_cell_style)],
        [Paragraph("<b>Live Game State</b>", table_cell_style), Paragraph("RAM In-Memory Map", table_cell_style), Paragraph("Sub-millisecond access for strokes, timers, sockets", table_cell_style), Paragraph("<code>ConcurrentHashMap</code> / Redis caching beans", table_cell_style)]
    ]
    t_stack = Table(stack_data, colWidths=[70, 110, 174, 150])
    t_stack.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    story.append(t_stack)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Key Architectural Synergies:", h2_style))
    story.append(Paragraph(
        "<b>1. Event-Driven Concurrency:</b> Node.js executes JavaScript on a single thread with an event-driven non-blocking I/O loop. "
        "Unlike standard thread-per-request servlet models in traditional Java servers, Node.js handles thousands of concurrent WebSocket connections "
        "with minimal memory footprint.<br/>"
        "<b>2. OOP Domain Modeling in TypeScript:</b> To maintain enterprise design quality, backend business logic is encapsulated in OOP classes "
        "(<code>Room</code>, <code>Game</code>, <code>Round</code>, <code>Player</code>), perfectly mirroring Spring Boot domain-driven architecture.<br/>"
        "<b>3. Authoritative Game Rules:</b> Just like a Spring Boot secure service layer, all critical game state transitions (word validation, "
        "round timers, drawer rotation, score calculation) are exclusively executed on the server, ensuring clients cannot manipulate gameplay.",
        body_style
    ))

    # ==================== PAGE 3 ====================
    story.append(PageBreak())
    story.append(Paragraph("3. High-Level System Architecture", h1_style))
    story.append(Paragraph(
        "The system architecture strictly decouples <b>real-time ephemeral gameplay</b> from <b>persistent historical storage</b>. "
        "The React frontend communicates over persistent WebSockets (Socket.IO) for high-frequency gameplay events and standard HTTP REST "
        "for stateless operations like health checks.",
        body_style
    ))
    story.append(create_architecture_diagram())
    story.append(Spacer(1, 8))

    story.append(Paragraph("Component Responsibilities Breakdown:", h2_style))
    arch_comp_data = [
        [Paragraph("Component", table_header_style), Paragraph("Runtime Location", table_header_style), Paragraph("Responsibilities & Guarantees", table_header_style)],
        [Paragraph("<b>React UI + Canvas</b>", table_cell_style), Paragraph("Browser (Client)", table_cell_style), Paragraph("Captures mouse/pointer events, converts to normalized <code>(0..1)</code> coordinates, renders received vector stroke sequences, displays masked secret words and chat.", table_cell_style)],
        [Paragraph("<b>Socket.IO Gateway</b>", table_cell_style), Paragraph("Node.js (Server)", table_cell_style), Paragraph("Maintains full-duplex socket connections, maps <code>socket.id</code> to <code>player_id</code>, handles room join/leave broadcasts, filters unauthorized incoming events.", table_cell_style)],
        [Paragraph("<b>OOP Game Engine</b>", table_cell_style), Paragraph("Node.js (Server)", table_cell_style), Paragraph("Authoritative state machine (<code>Room</code>, <code>Game</code>, <code>Round</code>). Controls turn rotation, picks random words, runs authoritative 60s countdown clock, validates word guesses.", table_cell_style)],
        [Paragraph("<b>In-Memory Store</b>", table_cell_style), Paragraph("Server RAM", table_cell_style), Paragraph("Holds stroke buffer for mid-round joiners and undo operations, secret word strings, and active timer intervals. Zero disk I/O during drawing.", table_cell_style)],
        [Paragraph("<b>MySQL 8.0 Container</b>", table_cell_style), Paragraph("Docker Volume", table_cell_style), Paragraph("Permanently archives room configs, game sessions, completed round summaries, player leaderboards, and categorized word dictionary.", table_cell_style)]
    ]
    t_arch_comp = Table(arch_comp_data, colWidths=[110, 94, 300])
    t_arch_comp.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_arch_comp)

    # ==================== PAGE 4 ====================
    story.append(PageBreak())
    story.append(Paragraph("4. Complete Game Workflow Flowchart", h1_style))
    story.append(Paragraph(
        "The complete end-to-end game lifecycle progresses through strict, server-controlled state machine phases. "
        "At no point can a client trigger a state transition without server validation.",
        body_style
    ))
    story.append(create_game_workflow_diagram())
    story.append(Spacer(1, 10))

    story.append(Paragraph("Phase-by-Phase Technical Progression:", h2_style))
    story.append(Paragraph(
        "<b>1. Room Creation:</b> Host submits configuration form. Server creates row in MySQL <code>rooms</code> table with status <code>'LOBBY'</code> and allocates an in-memory <code>Room</code> instance.<br/>"
        "<b>2. Joining & Roster Sync:</b> Players join by entering the room code. Sockets join the Socket.IO room channel. Server emits <code>player_joined</code> to update all client lobby screens in real time.<br/>"
        "<b>3. Game Initiation:</b> Host clicks 'Start Game'. Server verifies sender socket matches <code>hostPlayerId</code>, updates <code>rooms.status = 'PLAYING'</code>, initializes <code>Game</code>, and queues player turns.<br/>"
        "<b>4. Word Selection Phase:</b> Server picks 3 random words from the word catalog. Emits <code>round_start</code> with word options <b>exclusively to the active drawer</b>. Guessers receive masked blank format.<br/>"
        "<b>5. Live Drawing & Guessing:</b> Drawer selects word; server starts authoritative countdown timer. Drawer emits stroke packets. Guessers submit guesses in chat. Correct guessers earn speed-based points.<br/>"
        "<b>6. Turn Concession / Round End:</b> When time expires or all players guess correctly, server reveals secret word, calculates drawer compensation points, flushes scores to MySQL, and rotates to next drawer.<br/>"
        "<b>7. Game Conclusion:</b> When all configured rounds conclude, server calculates final podium standings, updates MySQL <code>game_sessions.status = 'COMPLETED'</code>, and emits <code>game_over</code>.",
        body_style
    ))

    # ==================== PAGE 5 ====================
    story.append(PageBreak())
    story.append(Paragraph("5. Relational Database Design & Schema Specifications", h1_style))
    story.append(Paragraph(
        "The relational schema is designed in 3rd Normal Form (3NF) to provide relational integrity, eliminate redundancy, and "
        "support historical analytics (e.g. win rates, top words, average guess times). It runs inside Docker with persistent storage.",
        body_style
    ))

    story.append(Paragraph("Table: <code>rooms</code> (Master Room Configuration & Status)", h2_style))
    t1_data = [
        [Paragraph("Column", table_header_style), Paragraph("Type", table_header_style), Paragraph("Constraints", table_header_style), Paragraph("Description & Purpose", table_header_style)],
        [Paragraph("<code>room_id</code>", table_cell_code), Paragraph("VARCHAR(10)", table_cell_style), Paragraph("PRIMARY KEY", table_cell_style), Paragraph("Unique alphanumeric room code (e.g. 'SKR-482')", table_cell_style)],
        [Paragraph("<code>room_name</code>", table_cell_code), Paragraph("VARCHAR(64)", table_cell_style), Paragraph("NOT NULL", table_cell_style), Paragraph("Display name for public/private room identification", table_cell_style)],
        [Paragraph("<code>host_name</code>", table_cell_code), Paragraph("VARCHAR(64)", table_cell_style), Paragraph("NOT NULL", table_cell_style), Paragraph("Screen name of the room creator", table_cell_style)],
        [Paragraph("<code>max_players</code>", table_cell_code), Paragraph("INT", table_cell_style), Paragraph("DEFAULT 8", table_cell_style), Paragraph("Maximum concurrent participants allowed (2-20)", table_cell_style)],
        [Paragraph("<code>total_rounds</code>", table_cell_code), Paragraph("INT", table_cell_style), Paragraph("DEFAULT 3", table_cell_style), Paragraph("Number of complete rounds to play (2-10)", table_cell_style)],
        [Paragraph("<code>draw_time_seconds</code>", table_cell_code), Paragraph("INT", table_cell_style), Paragraph("DEFAULT 80", table_cell_style), Paragraph("Duration of each drawing turn (15-240s)", table_cell_style)],
        [Paragraph("<code>is_private</code>", table_cell_code), Paragraph("BOOLEAN", table_cell_style), Paragraph("DEFAULT FALSE", table_cell_style), Paragraph("True if invite-only; false if visible to public matchmaker", table_cell_style)],
        [Paragraph("<code>status</code>", table_cell_code), Paragraph("ENUM(...)", table_cell_style), Paragraph("DEFAULT 'LOBBY'", table_cell_style), Paragraph("'LOBBY', 'PLAYING', 'FINISHED', 'ABANDONED'", table_cell_style)],
        [Paragraph("<code>created_at</code>", table_cell_code), Paragraph("TIMESTAMP", table_cell_style), Paragraph("CURRENT_TIMESTAMP", table_cell_style), Paragraph("Creation timestamp for audit and TTL cleanup", table_cell_style)]
    ]
    t1 = Table(t1_data, colWidths=[90, 80, 110, 224])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(t1)
    story.append(Spacer(1, 6))

    story.append(Paragraph("Table: <code>players</code> (Participant Profiles)", h2_style))
    t2_data = [
        [Paragraph("Column", table_header_style), Paragraph("Type", table_header_style), Paragraph("Constraints", table_header_style), Paragraph("Description & Purpose", table_header_style)],
        [Paragraph("<code>player_id</code>", table_cell_code), Paragraph("VARCHAR(36)", table_cell_style), Paragraph("PRIMARY KEY", table_cell_style), Paragraph("UUID v4 identifying the player session", table_cell_style)],
        [Paragraph("<code>room_id</code>", table_cell_code), Paragraph("VARCHAR(10)", table_cell_style), Paragraph("FK -> rooms(room_id) ON DELETE CASCADE", table_cell_style), Paragraph("Associated room identifier", table_cell_style)],
        [Paragraph("<code>player_name</code>", table_cell_code), Paragraph("VARCHAR(64)", table_cell_style), Paragraph("NOT NULL", table_cell_style), Paragraph("Display nickname selected by user", table_cell_style)],
        [Paragraph("<code>avatar_id</code>", table_cell_code), Paragraph("VARCHAR(32)", table_cell_style), Paragraph("DEFAULT 'avatar_1'", table_cell_style), Paragraph("Selected avatar identifier", table_cell_style)],
        [Paragraph("<code>is_host</code>", table_cell_code), Paragraph("BOOLEAN", table_cell_style), Paragraph("DEFAULT FALSE", table_cell_style), Paragraph("True if player possesses host moderation rights", table_cell_style)],
        [Paragraph("<code>total_score</code>", table_cell_code), Paragraph("INT", table_cell_style), Paragraph("DEFAULT 0", table_cell_style), Paragraph("Cumulative score across all turns in this room", table_cell_style)],
        [Paragraph("<code>is_connected</code>", table_cell_code), Paragraph("BOOLEAN", table_cell_style), Paragraph("DEFAULT TRUE", table_cell_style), Paragraph("Real-time presence flag for disconnect detection", table_cell_style)]
    ]
    t2 = Table(t2_data, colWidths=[90, 80, 150, 184])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(t2)
    story.append(Spacer(1, 6))

    story.append(Paragraph("Tables: <code>game_sessions</code>, <code>game_rounds</code>, <code>player_round_scores</code> & <code>words</code>", h2_style))
    t34_data = [
        [Paragraph("Table Name", table_header_style), Paragraph("Primary Key", table_header_style), Paragraph("Key Foreign Keys", table_header_style), Paragraph("Core Columns & Functional Purpose", table_header_style)],
        [Paragraph("<code>game_sessions</code>", table_cell_code), Paragraph("<code>session_id</code> (UUID)", table_cell_style), Paragraph("<code>room_id</code>, <code>winner_id</code>", table_cell_style), Paragraph("Tracks full match duration, total rounds completed, status (IN_PROGRESS, COMPLETED, ABORTED), and final winner.", table_cell_style)],
        [Paragraph("<code>game_rounds</code>", table_cell_code), Paragraph("<code>round_id</code> (UUID)", table_cell_style), Paragraph("<code>session_id</code>, <code>drawer_id</code>, <code>word_id</code>", table_cell_style), Paragraph("Records each turn: round number, turn sequence, drawer player, chosen secret word, and start/finish timestamps.", table_cell_style)],
        [Paragraph("<code>player_round_scores</code>", table_cell_code), Paragraph("<code>score_id</code> (UUID)", table_cell_style), Paragraph("<code>round_id</code>, <code>player_id</code>", table_cell_style), Paragraph("Detailed score audit: whether guessed correctly, seconds taken to guess, points earned, and drawer bonus points.", table_cell_style)],
        [Paragraph("<code>words</code>", table_cell_code), Paragraph("<code>word_id</code> (INT)", table_cell_style), Paragraph("None (Master Catalog)", table_cell_style), Paragraph("Word dictionary with categories (ANIMALS, OBJECTS, ACTIONS, FOOD, PLACES) and difficulty levels (EASY, MEDIUM, HARD).", table_cell_style)]
    ]
    t34 = Table(t34_data, colWidths=[100, 80, 120, 204])
    t34.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
    ]))
    story.append(t34)

    # ==================== PAGE 6 ====================
    story.append(PageBreak())
    story.append(Paragraph("6. Visual Entity-Relationship (ER) Diagram", h1_style))
    story.append(Paragraph(
        "The following diagram illustrates the relational associations, primary keys, and foreign key constraints between the "
        "database tables. Cascading deletes ensure that removing an inactive room cleanly purges child players, sessions, and "
        "rounds without orphan records.",
        body_style
    ))
    story.append(create_er_diagram())
    story.append(Spacer(1, 8))

    story.append(Paragraph("7. Socket.IO Real-Time Protocol Specification", h1_style))
    story.append(Paragraph(
        "WebSocket events follow a strict, typed protocol matching the assignment specification. Payloads are validated server-side "
        "to guarantee integrity and prevent payload tampering.",
        body_style
    ))

    socket_events_data = [
        [Paragraph("Event Name", table_header_style), Paragraph("Direction", table_header_style), Paragraph("Payload Structure", table_header_style), Paragraph("Functional Description", table_header_style)],
        [Paragraph("<code>create_room</code>", table_cell_code), Paragraph("Client -> Server", table_cell_style), Paragraph("<code>{ hostName, settings }</code>", table_cell_style), Paragraph("Host initializes new room with custom rules", table_cell_style)],
        [Paragraph("<code>join_room</code>", table_cell_code), Paragraph("Client -> Server", table_cell_style), Paragraph("<code>{ roomId, playerName }</code>", table_cell_style), Paragraph("Player joins existing room by code or invite link", table_cell_style)],
        [Paragraph("<code>player_joined</code>", table_cell_code), Paragraph("Server -> Clients", table_cell_style), Paragraph("<code>{ player, players }</code>", table_cell_style), Paragraph("Broadcasts updated participant roster to all members", table_cell_style)],
        [Paragraph("<code>start_game</code>", table_cell_code), Paragraph("Client -> Server", table_cell_style), Paragraph("<code>{}</code> (Host only)", table_cell_style), Paragraph("Host triggers game start; server validates permission", table_cell_style)],
        [Paragraph("<code>round_start</code>", table_cell_code), Paragraph("Server -> Clients", table_cell_style), Paragraph("<code>{ drawerId, wordOptions, drawTime }</code>", table_cell_style), Paragraph("Drawer receives 3 word choices; guessers see masked blanks", table_cell_style)],
        [Paragraph("<code>word_chosen</code>", table_cell_code), Paragraph("Client -> Server", table_cell_style), Paragraph("<code>{ word }</code>", table_cell_style), Paragraph("Drawer selects word; server starts authoritative timer", table_cell_style)],
        [Paragraph("<code>draw_start</code>", table_cell_code), Paragraph("Client -> Server", table_cell_style), Paragraph("<code>{ x, y, color, size, tool }</code>", table_cell_style), Paragraph("Drawer begins stroke; verified against active drawer socket", table_cell_style)],
        [Paragraph("<code>draw_data</code>", table_cell_code), Paragraph("Server -> Clients", table_cell_style), Paragraph("<code>{ ...strokeCoords }</code>", table_cell_style), Paragraph("Server broadcasts stroke data to all viewers in room", table_cell_style)],
        [Paragraph("<code>guess</code>", table_cell_code), Paragraph("Client -> Server", table_cell_style), Paragraph("<code>{ text }</code>", table_cell_style), Paragraph("Guesser types guess; server normalizes & validates", table_cell_style)],
        [Paragraph("<code>guess_result</code>", table_cell_code), Paragraph("Server -> Clients", table_cell_style), Paragraph("<code>{ correct, playerId, points }</code>", table_cell_style), Paragraph("Emits points to guesser; announces solver to room", table_cell_style)],
        [Paragraph("<code>round_end</code>", table_cell_code), Paragraph("Server -> Clients", table_cell_style), Paragraph("<code>{ word, scores, nextDrawer }</code>", table_cell_style), Paragraph("Reveals secret word; broadcasts round score breakdown", table_cell_style)],
        [Paragraph("<code>game_over</code>", table_cell_code), Paragraph("Server -> Clients", table_cell_style), Paragraph("<code>{ winner, leaderboard }</code>", table_cell_style), Paragraph("All rounds complete; displays final victory podium", table_cell_style)]
    ]
    t_socket = Table(socket_events_data, colWidths=[80, 80, 140, 204])
    t_socket.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 0), (-1, -1), 2.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2),
    ]))
    story.append(t_socket)

    # ==================== PAGE 7 ====================
    story.append(PageBreak())
    story.append(Paragraph("8. In-Memory State vs MySQL Persistence & OOP Engine", h1_style))
    story.append(Paragraph(
        "A critical engineering requirement is knowing when to write to MySQL versus when to retain data in memory. "
        "Writing every mouse coordinate or 1-second timer tick to disk would cripple database performance.",
        body_style
    ))

    mem_vs_db_data = [
        [Paragraph("State Dimension", table_header_style), Paragraph("In-Memory Server State (RAM)", table_header_style), Paragraph("Persistent MySQL State (InnoDB)", table_header_style)],
        [Paragraph("<b>Stored Entities</b>", table_cell_style), Paragraph("Active sockets, stroke buffer, active timers, unmasked secret word, correct solvers set, current turn queue index.", table_cell_style), Paragraph("Room configs, player records, game session metadata, round summaries, player round score audit, word dictionary.", table_cell_style)],
        [Paragraph("<b>Update Frequency</b>", table_cell_style), Paragraph("30 to 60 events/second during active drawing; 1 tick/second for countdown timer.", table_cell_style), Paragraph("Written strictly on milestone events: room creation, round completion, and game finish.", table_cell_style)],
        [Paragraph("<b>Performance Goal</b>", table_cell_style), Paragraph("Sub-millisecond access and instant WebSocket broadcast to prevent lag.", table_cell_style), Paragraph("Permanent audit trail, historical queries, and leaderboard persistence across server restarts.", table_cell_style)]
    ]
    t_mem = Table(mem_vs_db_data, colWidths=[90, 204, 210])
    t_mem.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_mem)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Object-Oriented Domain Model (Bonus Architecture):", h2_style))
    story.append(Paragraph(
        "Instead of unstructured procedural socket handlers, the backend server encapsulates domain logic into clean OOP classes:<br/>"
        "• <b><code>Player</code>:</b> Encapsulates socket identity, screen name, avatar, connection state, and total score.<br/>"
        "• <b><code>Room</code>:</b> Manages room lifecycle, player roster, host privileges, room status machine, and room-scoped broadcasts.<br/>"
        "• <b><code>Game</code>:</b> Controls the match state, turn queue, round progression, and podium calculation.<br/>"
        "• <b><code>Round</code>:</b> Encapsulates active drawer, secret word, word options, letter hint schedule, authoritative timer, and stroke buffer.<br/>"
        "• <b><code>ScoringEngine</code>:</b> Encapsulates point algorithms: <code>points = Math.round(500 * (remainingTime / totalTime))</code>.",
        body_style
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("9. Proposed Codebase Architecture", h1_style))
    story.append(Paragraph(
        "The project follows a clean, modular full-stack structure with clear separation of concerns:",
        body_style
    ))

    codebase_data = [
        [Paragraph("Directory / Package", table_header_style), Paragraph("Role & Responsibilities", table_header_style)],
        [Paragraph("<code>frontend/src/components/</code>", table_cell_code), Paragraph("Reusable UI components: <code>Canvas</code>, <code>CanvasToolbar</code>, <code>ChatBox</code>, <code>Leaderboard</code>, <code>TimerDisplay</code>, <code>WordHint</code>.", table_cell_style)],
        [Paragraph("<code>frontend/src/pages/</code>", table_cell_code), Paragraph("Top-level views: <code>CreateRoom</code>, <code>JoinRoom</code>, <code>Lobby</code>, <code>GameView</code>, <code>GameOver</code>.", table_cell_style)],
        [Paragraph("<code>frontend/src/hooks/</code>", table_cell_code), Paragraph("Custom React hooks: <code>useCanvas</code> (drawing logic), <code>useSocket</code> (WebSocket lifecycle and listeners).", table_cell_style)],
        [Paragraph("<code>backend/src/game/</code>", table_cell_code), Paragraph("OOP domain entities: <code>Room.ts</code>, <code>Game.ts</code>, <code>Round.ts</code>, <code>Player.ts</code>, <code>ScoringEngine.ts</code>, <code>WordManager.ts</code>.", table_cell_style)],
        [Paragraph("<code>backend/src/sockets/</code>", table_cell_code), Paragraph("Typed Socket.IO handlers: <code>roomHandler.ts</code>, <code>drawingHandler.ts</code>, <code>chatHandler.ts</code>, <code>gameHandler.ts</code>.", table_cell_style)],
        [Paragraph("<code>backend/src/db/</code>", table_cell_code), Paragraph("Database connection pool, schema migration scripts, and DAO query repositories.", table_cell_style)],
        [Paragraph("<code>docker-compose.yml</code>", table_cell_code), Paragraph("Container orchestrator running MySQL 8.0 with persistent data volume <code>mysql_data</code>.", table_cell_style)]
    ]
    t_codebase = Table(codebase_data, colWidths=[160, 344])
    t_codebase.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
    ]))
    story.append(t_codebase)

    # ==================== PAGE 8 ====================
    story.append(PageBreak())
    story.append(Paragraph("10. Deployment Architecture", h1_style))
    story.append(Paragraph(
        "The application is architected for seamless local development via Docker Compose and high-performance cloud deployment. "
        "Because real-time drawing requires persistent WebSocket connections, standard serverless environments (like AWS Lambda or standard Vercel serverless functions) "
        "are paired with a persistent containerized backend.",
        body_style
    ))

    deploy_data = [
        [Paragraph("Environment", table_header_style), Paragraph("Component", table_header_style), Paragraph("Hosting / Runtime", table_header_style), Paragraph("Configuration & Networking", table_header_style)],
        [Paragraph("<b>Local Development</b>", table_cell_style), Paragraph("MySQL Database", table_cell_style), Paragraph("Docker Compose (MySQL 8.0)", table_cell_style), Paragraph("Port <code>3306:3306</code>, volume <code>mysql_data</code>, env config via <code>.env</code>", table_cell_style)],
        [Paragraph("<b>Local Development</b>", table_cell_style), Paragraph("Node.js Backend", table_cell_style), Paragraph("Node.js 22 + tsx (Hot Reload)", table_cell_style), Paragraph("Port <code>5000</code>, CORS allowed for <code>http://localhost:5173</code>", table_cell_style)],
        [Paragraph("<b>Local Development</b>", table_cell_style), Paragraph("React Frontend", table_cell_style), Paragraph("Vite Dev Server (HMR)", table_cell_style), Paragraph("Port <code>5173</code>, connects to backend via <code>ws://localhost:5000</code>", table_cell_style)],
        [Paragraph("<b>Production Cloud</b>", table_cell_style), Paragraph("Persistent Backend", table_cell_style), Paragraph("Render / Railway Web Service", table_cell_style), Paragraph("Full WebSocket / WSS support, automatic health checks, zero sleep timeout", table_cell_style)],
        [Paragraph("<b>Production Cloud</b>", table_cell_style), Paragraph("Cloud Database", table_cell_style), Paragraph("Railway MySQL / Aiven Cloud", table_cell_style), Paragraph("Managed MySQL instance, encrypted SSL connections, persistent volume", table_cell_style)],
        [Paragraph("<b>Production Cloud</b>", table_cell_style), Paragraph("Frontend SPA", table_cell_style), Paragraph("Render Static / Vercel SPA", table_cell_style), Paragraph("CDN distribution, environment variable pointing to live backend WSS URL", table_cell_style)]
    ]
    t_deploy = Table(deploy_data, colWidths=[90, 80, 130, 204])
    t_deploy.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_deploy)
    story.append(Spacer(1, 10))

    story.append(Paragraph("11. Technical Interview Preparation (Questions & Answers)", h1_style))
    story.append(Paragraph(
        "Here are 5 core architecture and database questions likely to be asked in the final interview, accompanied by concise, speakable answers:",
        body_style
    ))

    qa_list = [
        ("Q1: How do you prevent cheating in a multiplayer game where the client renders the canvas?",
         "Answer: The server is the single source of truth. The secret word is strictly held in server memory and is never transmitted to guessing clients until round completion. Guessers only receive masked blanks (e.g. '_ _ _ _ _'). Additionally, only the designated drawer's socket is authorized to broadcast drawing strokes; any stroke payload emitted by a guesser is rejected on the server."),
        
        ("Q2: Why did you separate in-memory game state from MySQL persistence instead of writing everything to the database?",
         "Answer: Drawing generates 30 to 60 coordinate events per second per drawer. Writing these high-frequency telemetry events directly to MySQL would saturate disk I/O and introduce noticeable lag for players. Instead, live strokes, active timers, and guess evaluation are handled entirely in Node.js RAM for sub-millisecond responsiveness. MySQL is used exclusively for structured milestone persistence: room creation, round summaries, and game results."),
        
        ("Q3: How do you handle coordinate scaling when different players have different monitor sizes?",
         "Answer: We normalize all stroke coordinates on the client before transmission. Instead of sending absolute pixel coordinates like (420, 310), we transmit normalized floating-point ratios between 0.0 and 1.0 (e.g., x / canvasWidth, y / canvasHeight). When receiving clients render the stroke, they multiply these normalized ratios by their local canvas dimensions, guaranteeing identical visual drawings regardless of device resolution or aspect ratio."),
        
        ("Q4: How does your Node.js backend architecture compare to an enterprise Spring Boot application?",
         "Answer: In Spring Boot, we would use Spring MVC controllers, Spring Data JPA repositories, and Spring WebSocket with STOMP messaging templates. In our Node.js stack, Express handles HTTP routes, mysql2 connection pooling handles database queries, and Socket.IO manages WebSockets. To preserve enterprise design standards, we structured the game engine using OOP principles (Room, Game, Round, and Player classes), mirroring Spring's domain-driven separation of concerns."),
        
        ("Q5: What happens if the room host or the active drawer abruptly disconnects?",
         "Answer: The server listens for socket disconnect events. If the active drawer disconnects, the authoritative timer is cleared, the current round is finalized with a notification to the room, and the turn queue automatically rotates to the next player. If the room host disconnects during the lobby, the server automatically migrates host privileges to the next oldest connected player in the room.")
    ]

    for q, a in qa_list:
        story.append(Paragraph(f"<b>{q}</b>", h2_style))
        story.append(Paragraph(a, body_style))
        story.append(Spacer(1, 2))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF at: {output_path}")

if __name__ == "__main__":
    target = os.path.abspath("docs/architecture-and-database.pdf")
    generate_pdf(target)
