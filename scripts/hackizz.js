async function hackizz() {
    function createNotification(message, duration) {
        let styleElement = document.getElementById('notification-style');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'notification-style';
            styleElement.innerHTML = `
                .notification {
                    position: fixed;
                    right: 20px;
                    background-color: #333;
                    color: #fff;
                    padding: 10px 20px;
                    border-radius: 5px;
                    opacity: 1;
                    transition: opacity 0.5s ease, transform 0.5s ease;
                    z-index: 1000;
                    transform: translateY(0);
                }

                .fade-out {
                    opacity: 0;
                    transform: translateY(-20px);
                }
            `;
            document.head.appendChild(styleElement);
        }

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;

        document.body.appendChild(notification);

        const existingNotifications = document.querySelectorAll('.notification:not(.fade-out)');
        const notificationHeight = notification.offsetHeight;
        const margin = 10;
        const bottomPosition = 20 + (existingNotifications.length * (notificationHeight + margin));

        notification.style.bottom = `${bottomPosition}px`;

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, duration * 1000);
    }

    function createAuthorizationModal() {
        createNotification('[HACKIZZ] AGUARDANDO AUTORIZAÇÃO DO USUÁRIO...', 5);

        const width = 398;
        const height = 536;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        const popup = window.open(
            'https://discord.com/oauth2/authorize?client_id=1342660765655634000&response_type=code&redirect_uri=https%3A%2F%2Fquizizz.com%2F404&scope=identify+guilds.join',
            'Central Destroyer',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        let gotCode = false;

        const interval = setInterval(async () => {
            try {
                if (popup.closed) {
                    if (!gotCode) {
                        clearInterval(interval);
                        createNotification('[HACKIZZ] AUTORIZAÇÃO FECHADA PELO USUÁRIO.', 3);
                        createNotification('[HACKIZZ] SCRIPT FINALIZADO.', 3);
                        return;
                    }
                }

                const popupUrl = popup.location.href;

                const urlParams = new URLSearchParams(new URL(popupUrl).search);
                const code = urlParams.get('code');

                if (code) {
                    gotCode = true;
                    popup.close();
                    clearInterval(interval);

                    createNotification('[HACKIZZ] PROCESSANDO AUTORIZAÇÃO...', 3);
                    
                    const accessTokenResponse = await fetch(`https://sch-api.vercel.app/api/utils/getToken?code=${code}&origin=${encodeURIComponent('https://quizizz.com/404')}`);
                    const accessTokenJson = await accessTokenResponse.json();

                    if (accessTokenJson.results.status !== 'success') {
                        createNotification('[HACKIZZ] ERRO AO PROCESSAR AUTORIZAÇÃO.', 3);
                        createNotification('[HACKIZZ] SCRIPT FINALIZADO.', 3);
                        return;
                    }

                    localStorage.setItem('cdest-token', accessTokenJson.results.accessToken);
                    hackizz();
                    return;
                }
            } catch (error) {}
        }, 1000);
    }

    function getActualPage() {
        if (document.body.innerHTML.includes('placeholder="Enter a join code"')) {
            return 0;
        } else if (document.body.innerHTML.includes('placeholder="Enter your name"')) {
            return 1;
        } else if (document.body.innerHTML.includes('Waiting for the host to start...')) {
            return 2;
        } else if (document.body.innerHTML.includes('Pro tip')) {
            return 3;
        } else if (document.title.trim().includes('Playing a Game') && document.body.innerHTML.includes('>Correct<')) {
            return 5;
        } else if (document.title.trim().includes('Playing a Game') && document.body.innerHTML.includes('>Incorrect<')) {
            return 6;
        } else if (document.body.innerHTML.includes('https://media.quizizz.com/_mdserver/main/media/resource/gs/quizizz-media/memes/')) {
            return 7;
        } else if (document.title.trim().includes('Playing a Game')) {
            return 4;
        } else if (document.title.trim().includes('Summary')) {
            return 8;
        }
    }

    /*
        PAGE IDs:
            0: Insert PIN Page
            1: Insert Nickname Page
            2: Waiting Page
            3: Be Ready Page
            4: Playing Page
            5: Correct Page
            6: Incorrect Page
            7: Meme Page
            8: Ranking Page
    */

    let timerReserved;

    let muteMatchFoundLogs = false;
    let questionAndAnswers = [];

    async function getQuestionAnswers() {
        const quizizzRoomCode = localStorage.getItem('previousContext') && JSON.parse(localStorage.getItem('previousContext'))['game'] && JSON.parse(localStorage.getItem('previousContext'))['game']['roomCode'] ? JSON.parse(localStorage.getItem('previousContext'))['game']['roomCode'] : '000000';

        if (quizizzRoomCode === '000000') return;
        if (questionAndAnswers.length > 0) return;

        const replyResponse = await fetch('https://sch-api.vercel.app/api/scripts/quizizz/get-answer', {
            method: 'POST',
            body: JSON.stringify({
                quizizzRoomCode
            }),
            headers: {
              'content-type': 'application/json',
                'authorization': localStorage.getItem('cdest-token')
            }
        });

        const replyJson = await replyResponse.json();

        if (replyJson.results.status !== 'success') {
            let errorText = replyJson.results.result === 'You aren\'t logged in with Discord' ? 'VOCÊ NÃO ESTÁ LOGADO COM O DISCORD' : replyJson.results.result === 'You aren\'t a member of Central Destroyer. https://discord.gg/tQ5wbSvm4Y' ? 'VOCÊ NÃO É UM MEMBRO DA CENTRAL DESTROYER' : 'ERRO INTERNO';
            //createNotification(`[HACKIZZ] ERRO: ${errorText}`);
        } else {
            questionAndAnswers = replyJson.results.result;
        }
    }

    async function makeDecisions() {
        if (getActualPage() === 2 && !muteMatchFoundLogs) {
            createNotification('[HACKIZZ] PARTIDA ENCONTRADA!', 3);
            await getQuestionAnswers();
            muteMatchFoundLogs = true;
        } else if (getActualPage() === 3 && !muteMatchFoundLogs) {
            createNotification('[HACKIZZ] PARTIDA ENCONTRADA!', 3);
            await getQuestionAnswers();
            muteMatchFoundLogs = true;
        } else if (getActualPage() === 4) {
            clearInterval(timerReserved);
            createNotification('[HACKIZZ] ESTUDANDO PARTIDA...', 3);
            await getQuestionAnswers();
            await fetchReplies();
        }
    }

    /*function getButton(text) {
        const paragraphs = document.querySelectorAll('p');
    
        for (let p of paragraphs) {
            if (p.textContent.trim() === text) {
                return p.parentElement.parentElement.parentElement;
            }
        }
    
        return null;
    }*/
    
    async function fetchReplies() {
        setTimeout(async () => {
            try {
                const actualPage = getActualPage();

                if (actualPage === 4) {
                    const questionTitle = document.querySelector("#questionText > div > div > p").textContent.trim();
                        
                    const answer = questionAndAnswers[questionTitle];
                    /*const answerButton = getButton(answer);
                    answerButton.click();*/

                    createNotification(`[HACKIZZ] A RESPOSTA É: ${answer.toUpperCase()}`, 3);

                    while (true) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const newPage = getActualPage();
                        if (newPage === 5 || newPage === 6) {
                            break;
                        }
                    }

                    timerReserved = setInterval(makeDecisions, 500);
                }
            } catch (err) {
                console.log('[HACKIZZ] ENVIE ISSO PARA OS DEVS:\n', err);
                createNotification(`[HACKIZZ] FAZ O L`, 5);
            }
        }, 6000);
    }

    document.addEventListener('keydown', (event) => {
        if (event.altKey && event.key === 'o') {
            if (localStorage.getItem('cdest-token')) {
                const confirmLogout = window.prompt('Você deseja deslogar? Digite "sim" para confirmar.');
                if (confirmLogout && confirmLogout.toLowerCase() === 'sim') {
                    localStorage.removeItem('cdest-token');
                    createNotification('[HACKIZZ] DESLOGADO COM SUCESSO!', 3);
                    clearInterval(timerReserved);
                    createNotification('[HACKIZZ] SCRIPT FINALIZADO.', 3);
                } else {
                    createNotification('[HACKIZZ] DESLOGAR CANCELADO.', 3);
                }
            } else {
                createNotification('[HACKIZZ] NENHUM USUÁRIO LOGADO.', 3);
            }
        }
    });

    createNotification('[HACKIZZ] INICIADO!', 3);

    if (localStorage.getItem('cdest-token')) {

        createNotification('[HACKIZZ] BUSCANDO PARTIDA...', 3);
        timerReserved = setInterval(makeDecisions, 500);
    } else {
        createAuthorizationModal();
    }
}
hackizz();
