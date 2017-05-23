const configure = (app) => {
    app.get('/search', (req, res) => {
        res.render('search');
    });

    app.post('/search', (req, res) => {
        res.render('search');
    });
};

module.exports = configure;
