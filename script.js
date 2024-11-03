document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.querySelector("#gameCanvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    let gameStarted = false;
    const enemies = [];
    const towers = [];
    const projectiles = [];
    let money = 60;
    let towerCost = 10;
    let lives = 5;
    let gameSeconds = 0;

    let waveNumber = 1; // Current wave number
    const waveInterval = 17500; // 17.5 seconds between waves
    let isWaveActive = false;

    // Path coordinates for multiple paths
    const paths = [
        [
            { x: 0, y: 300 },
            { x: 100, y: 300 },
            { x: 100, y: 550 },
            { x: 400, y: 550 },
            { x: 400, y: 150 },
            { x: 700, y: 150 },
            { x: 700, y: 0 }
        ],
        // Additional paths can be added here
    ];

    function drawPath() {
        paths.forEach(path => {
            ctx.strokeStyle = '#EADDCA';
            ctx.lineWidth = 65;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            path.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.stroke();
        });
    }

    class Tower {
        constructor(x, y, range, rateOfFire) {
            this.x = x;
            this.y = y;
            this.range = range;
            this.rateOfFire = rateOfFire;
            this.lastShotTime = 0;
            this.level = 1; // Start at level 1
            this.upgradeCost = 20; // Set initial upgrade cost
            this.isHovered = false; // Track hover state
        }

        draw(ctx) {
            ctx.fillStyle = this.isHovered ? 'lightblue' : 'blue'; // Change color on hover
            ctx.beginPath();
            ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
            ctx.fill();

            // Display tower level
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(Lv${this.level}, this.x - 10, this.y + 5);
        }

        shoot(enemies, currentTime) {
            if (currentTime - this.lastShotTime > this.rateOfFire) {
                for (let enemy of enemies) {
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < this.range) {
                        const projectile = new Projectile(this.x, this.y, enemy);
                        projectiles.push(projectile);
                        this.lastShotTime = currentTime;
                        break;
                    }
                }
            }
        }

        upgrade() {
            if (this.level < 10 && money >= this.upgradeCost) {
                this.level++;
                this.range += 10; // Increase range by 10 per level
                this.rateOfFire -= 50; // Decrease rateOfFire for faster shooting
                money -= this.upgradeCost;
                this.upgradeCost += 10; // Increase upgrade cost for next level
            }
        }
    }

    class Projectile {
        constructor(x, y, target) {
            this.x = x;
            this.y = y;
            this.target = target;
            this.speed = 5;
            this.active = true;
        }

        update() {
            if (!this.active) return;

            if (!this.target || this.target.health <= 0) {
                this.active = false;
                return;
            }

            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.speed) {
                this.active = false;
                this.target.health -= 10;
                if (this.target.health <= 0) {
                    money += 5;
                }
            } else {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        }

        draw(ctx) {
            if (!this.active) return;
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    class Enemy {
        constructor(path, speed, health) {
            this.x = path[0].x;
            this.y = path[0].y;
            this.speed = speed;
            this.health = health;
            this.maxHealth = health;
            this.pathIndex = 0;
            this.path = path;
        }

        update() {
            if (this.pathIndex < this.path.length - 1) {
                const currentPoint = this.path[this.pathIndex];
                const nextPoint = this.path[this.pathIndex + 1];
                const dx = nextPoint.x - this.x;
                const dy = nextPoint.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.speed) {
                    this.x = nextPoint.x;
                    this.y = nextPoint.y;
                    this.pathIndex++;
                } else {
                    this.x += (dx / distance) * this.speed;
                    this.y += (dy / distance) * this.speed;
                }
            } else {
                this.reachedEnd();
            }
        }

        draw(ctx) {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
            ctx.fill();

            const barWidth = 30;
            const barHeight = 5;
            const healthPercent = this.health / this.maxHealth;

            ctx.fillStyle = 'black';
            ctx.fillRect(this.x - barWidth / 2, this.y - 25, barWidth, barHeight);

            ctx.fillStyle = healthPercent >= 0.5 ? 'green' : healthPercent >= 0.25 ? 'yellow' : 'red';
            ctx.fillRect(this.x - barWidth / 2, this.y - 25, barWidth * healthPercent, barHeight);
        }

        reachedEnd() {
            lives -= 1;
            enemies.splice(enemies.indexOf(this), 1);
            if (lives <= 0) {
                alert('Game Over');
                location.reload();
            }
        }
    }

    function createTower(x, y) {
        const range = 100;
        const rateOfFire = 1000;
        const tower = new Tower(x, y, range, rateOfFire);
        towers.push(tower);
        money -= towerCost;
    }

    document.getElementById("startButton").addEventListener("click", startGame);

    // Mouse coordinates for detecting hover
    let mouseX = 0;
    let mouseY = 0;

    // Track mouse position
    canvas.addEventListener("mousemove", (event) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = event.clientX - rect.left;
        mouseY = event.clientY - rect.top;
    });

    // Upgrade tower on single click if hovering
    canvas.addEventListener("click", (event) => {
        towers.forEach(tower => {
            if (tower.isHovered) {
                tower.upgrade();
            }
        });
    });

    function startWave() {
        isWaveActive = true;
        const path = paths[Math.floor(Math.random() * paths.length)];
        const enemySpeed = (1 / (waveNumber + 1)) * 2; // Scale speed with wave number
        const enemyHealth = 50 + waveNumber * 5; // Scale health with wave number

        const enemy = new Enemy(path, enemySpeed, enemyHealth);
        enemies.push(enemy);
        
        const waveCount = Math.floor(Math.random() * waveNumber + 5);
        
        if (enemies.length < waveCount) {
            setTimeout(startWave, Math.max(Math.random() * 1000, 2000)); // Spawn next enemy in the wave
        } else {
            isWaveActive = false;
        }
    }

    function animate() {
        ctx.fillStyle = '#50C878';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawPath();

        enemies.forEach((enemy, index) => {
            enemy.update();
            if (enemy.health <= 0) {
                enemies.splice(index, 1);
            } else {
                enemy.draw(ctx);
            }
        });

        const currentTime = Date.now();
        towers.forEach(tower => {
            // Check if mouse is hovering over tower
            const dx = tower.x - mouseX;
            const dy = tower.y - mouseY;
            tower.isHovered = Math.sqrt(dx * dx + dy * dy) < 20;

            tower.draw(ctx);
            tower.shoot(enemies, currentTime);
        });

        projectiles.forEach((projectile, index) => {
            projectile.update();
            if (projectile.active) {
                projectile.draw(ctx);
            } else {
                projectiles.splice(index, 1);
            }
        });

        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(Money: ${money}, 10, 20);
        ctx.fillText(Time: ${gameSeconds}, 10, 60);
        ctx.fillText(Lives: ${lives}, 10, 100);
        ctx.fillText(Wave: ${waveNumber}, 10, 140);

        requestAnimationFrame(animate);
    }

    function startGame() {
        if (!gameStarted) {
            gameStarted = true;
            animate();
            startWave();
            setInterval(() => {
                gameSeconds++;
            }, 1000);
        }
    }

    canvas.addEventListener("click", (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (money >= towerCost) {
            createTower(x, y);
        }
    });
});
