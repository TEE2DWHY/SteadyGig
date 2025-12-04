const createResponse = (
    res: any,
    statusCode: number,
    success: boolean,
    message: string,
    data: any = null,
) => {
    return res.status(statusCode).json({
        success,
        message,
        data,
    });
};

export const sendSuccessResponse = (
    res: any,
    statusCode: number | 200,
    message: string,
    data: any = null,
) => {
    return createResponse(res, statusCode, true, message, data);
};

export const sendErrorResponse = (
    res: any,
    statusCode: number,
    message: string,
) => {
    return createResponse(res, statusCode, false, message);
};

export default {
    sendSuccessResponse,
    sendErrorResponse,
};
