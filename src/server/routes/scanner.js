const configure = (app) => {
    app.get('/scanner', (req, res) => {
        res.render('scan-form', {
            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
            title: 'Analyze your website using sonar online'
        });
    });

    app.post('/scanner', (req, res) => {
        res.render('scan-result', { title: 'Results for your page | sonar' });
    });
};

module.exports = configure;
