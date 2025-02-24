async function hackoot() {
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
        createNotification('[HACKOOT] AGUARDANDO AUTORIZAÇÃO DO USUÁRIO...', 5);

        const width = 398;
        const height = 536;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        const popup = window.open(
            'https://discord.com/oauth2/authorize?client_id=1342660765655634000&response_type=code&redirect_uri=https%3A%2F%2Fkahoot.it%2F&scope=identify+guilds.join',
            'Central Destroyer',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        let gotCode = false;

        const interval = setInterval(async () => {
            try {
                if (popup.closed) {
                    if (!gotCode) {
                        clearInterval(interval);
                        createNotification('[HACKOOT] AUTORIZAÇÃO FECHADA PELO USUÁRIO.', 3);
                        createNotification('[HACKOOT] SCRIPT FINALIZADO.', 3);
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

                    createNotification('[HACKOOT] PROCESSANDO AUTORIZAÇÃO...', 3);
                    
                    const accessTokenResponse = await fetch(`https://sch-api.vercel.app/api/utils/getToken?code=${code}&origin=${encodeURIComponent('https://kahoot.it/')}`);
                    const accessTokenJson = await accessTokenResponse.json();

                    if (accessTokenJson.results.status !== 'success') {
                        createNotification('[HACKOOT] ERRO AO PROCESSAR AUTORIZAÇÃO.', 3);
                        createNotification('[HACKOOT] SCRIPT FINALIZADO.', 3);
                        return;
                    }

                    localStorage.setItem('cdest-token', accessTokenJson.results.accessToken);
                    hackoot();
                    return;
                }
            } catch (error) {}
        }, 1000);
    }

    function getActualPage() {
        if (document.body.innerHTML.includes('placeholder="PIN do jogo"')) {
            return 0;
        } else if (document.body.innerHTML.includes('placeholder="Apelido"')) {
            return 1;
        } else if (document.body.innerHTML.includes('Pronto! Está vendo seu apelido na tela?')) {
            return 2;
        } else if (document.body.innerHTML.includes('Prepare-se!')) {
            return 3;
        } else if (document.body.innerHTML.includes('data-functional-selector="question-index-counter"') && document.body.innerHTML.includes('>Correto<')) {
            return 5;
        } else if (document.body.innerHTML.includes('data-functional-selector="question-index-counter"') && document.body.innerHTML.includes('>Incorreto<')) {
            return 6;
        } else if (document.body.innerHTML.includes('data-functional-selector="question-index-counter"') && document.body.innerHTML.includes('>Slide<')) {
            return 7;
        } else if (document.body.innerHTML.includes('data-functional-selector="question-index-counter"')) {
            return 4;
        } else if (document.body.innerHTML.includes(' pontos ·')) {
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
            7: Ranking Page
    */

    let timerReserved;

    function filterElementsByClassSubstring(substring, elements = null) {
        const allElements = elements || document.querySelectorAll('*');

        const filteredElements = Array.from(allElements).filter(element => {
            return Array.from(element.classList).some(className => className.includes(substring));
        });

        return filteredElements;
    }

    function filterElementsByAttributeSubstring(attribute, substring, elements = null) {
        const allElements = elements || document.querySelectorAll('*');

        const filteredElements = Array.from(allElements).filter(element => {
            const attributeValue = element.getAttribute(attribute);
            return attributeValue && attributeValue.includes(substring);
        });

        return filteredElements;
    }

    let muteMatchFoundLogs = false;

    async function makeDecisions() {
        if (getActualPage() === 2 && !muteMatchFoundLogs) {
            createNotification('[HACKOOT] PARTIDA ENCONTRADA!', 3);
            muteMatchFoundLogs = true;
        } else if (getActualPage() === 3 && !muteMatchFoundLogs) {
            createNotification('[HACKOOT] PARTIDA ENCONTRADA!', 3);
            muteMatchFoundLogs = true;
        } else if (getActualPage() === 4) {
            clearInterval(timerReserved);
            createNotification('[HACKOOT] BUSCANDO RESPOSTA...', 3);
            await fetchReplies();
        }
    }

    async function fetchReplies() {
        setTimeout(async () => {
            try {
                const actualPage = getActualPage();

                if (actualPage === 4) {
                    const kahootTheme = 'Conhecimentos Gerais';
                    const kahootQuestion = filterElementsByClassSubstring('question-title')[0].textContent;
                    const kahootOptions = filterElementsByAttributeSubstring('data-functional-selector', 'question-choice-text').map(element => element.textContent);

                    createNotification('[HACKOOT] QUASE LÁ...', 3);

                    const replyResponse = await fetch('https://sch-api.vercel.app/api/scripts/kahoot/get-answer', {
                        method: 'POST',
                        body: JSON.stringify({
                            kahootTheme,
                            kahootQuestion,
                            kahootOptions
                        }),
                        headers: {
                            'content-type': 'application/json',
                            'authorization': localStorage.getItem('cdest-token')
                        }
                    });
                    const replyJson = await replyResponse.json();

                    if (replyJson.results.status !== 'success') {
                        let errorText = replyJson.results.result === 'You aren\'t logged in with Discord' ? 'VOCÊ NÃO ESTÁ LOGADO COM O DISCORD' : replyJson.results.result === 'You aren\'t a member of Central Destroyer. https://discord.gg/centraldestroyer' ? 'VOCÊ NÃO É UM MEMBRO DA CENTRAL DESTROYER' : 'ERRO INTERNO';

                        createNotification(`[HACKOOT] ERRO: ${errorText}`, 5);
                    } else {
                        createNotification(`[HACKOOT] A RESPOSTA É: ${replyJson.results.result.toUpperCase()}`, 5);                    
                    }

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
                console.log('[HACKOOT] ENVIE ISSO PARA OS DEVS:\n', err);
                createNotification(`[HACKOOT] FAZ O L`, 5);
            }
        }, 6000);
    }

    document.addEventListener('keydown', (event) => {
        if (event.altKey && event.key === 'o') {
            if (localStorage.getItem('cdest-token')) {
                const confirmLogout = window.prompt('Você deseja deslogar? Digite "sim" para confirmar.');
                if (confirmLogout && confirmLogout.toLowerCase() === 'sim') {
                    localStorage.removeItem('cdest-token');
                    createNotification('[HACKOOT] DESLOGADO COM SUCESSO!', 3);
                    clearInterval(timerReserved);
                    createNotification('[HACKOOT] SCRIPT FINALIZADO.', 3);
                } else {
                    createNotification('[HACKOOT] DESLOGAR CANCELADO.', 3);
                }
            } else {
                createNotification('[HACKOOT] NENHUM USUÁRIO LOGADO.', 3);
            }
        }
    });

    createNotification('[HACKOOT] INICIADO!', 3);

    if (localStorage.getItem('cdest-token')) {
        createNotification('[HACKOOT] BUSCANDO PARTIDA...', 3);
        timerReserved = setInterval(makeDecisions, 500);
    } else {
        createAuthorizationModal();
    }
}
hackoot();
