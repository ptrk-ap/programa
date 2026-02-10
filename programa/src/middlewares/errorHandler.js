function errorHandler(err, req, res, next) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            error: "Email já cadastrado"
        });
    }

    return res.status(500).json({
        error: "Erro interno do servidor"
    });
}

module.exports = errorHandler;
