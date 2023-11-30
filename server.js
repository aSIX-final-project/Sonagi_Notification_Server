const axios = require('axios');
const express = require('express');
const app = express();
const cron = require('node-cron');

// GET 요청 처리
app.get('/sendMemberNotification', async (req, res) => {
    try {
        const address = req.query.address;
        const response = await axios.get(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`, {
            headers: {
                Authorization: 'KakaoAK db06c51425b99419a11f3881f8491642',
            },
        });
        const coordinates = response.data.documents[0].road_address || response.data.documents[0].address;
        const addressX = parseFloat(coordinates.x);
        const addressY = parseFloat(coordinates.y);

        console.log(`addressX: ${addressX}, addressY: ${addressY}`);

        const memberResponse = await axios.get("https://port-0-sonagi-app-project-1drvf2lloka4swg.sel5.cloudtype.app/boot/member/findAll");
        const allMembers = memberResponse.data.list;
        console.log(allMembers);

        const expoTokens = [];

        for (const member of allMembers) {
            const memberAddress = member.address;
            const memberResponse = await axios.get(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(memberAddress)}`, {
                headers: {
                    Authorization: 'KakaoAK db06c51425b99419a11f3881f8491642',
                },
            });
            const memberCoordinates = memberResponse.data.documents[0].road_address || memberResponse.data.documents[0].address;
            const memberX = parseFloat(memberCoordinates.x);
            const memberY = parseFloat(memberCoordinates.y);
            const distance = getDistance(addressY, addressX, memberY, memberX);

            if (distance <= 5) {
                expoTokens.push(member.expotoken);
            }
        }

        await sendExpoPushNotificationMember(expoTokens);

        res.status(200).json({ message: 'Successfully got coordinates and sent messages to members within 5km', coordinates: coordinates });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET 요청 처리
app.get('/sendResNotification', async (req, res) => {
    const adName = req.query.adName;
    const resId = req.query.resId;
    const serving = req.query.serving;
    const foodName = req.query.foodName;

    const formData = {
        id: resId,
    };

    // 폼 데이터를 JSON 문자열로 변환하여 확인
    const jsonData = JSON.stringify(formData);
    console.log(jsonData);

    // 백엔드 서버로 POST 요청 보내기
    const resResponse = await axios.post(
        "https://port-0-sonagi-app-project-1drvf2lloka4swg.sel5.cloudtype.app/boot/restaurant/findById",
        formData
    );
    const expoToken = resResponse.data[0].expotoken;
    console.log(resResponse.data);
    console.log(expoToken);  // expotoken 값 출력
    await sendExpoPushNotificationRes(expoToken, adName, serving, foodName);
});

// 매일 00시에 실행되는 스케줄러 설정
cron.schedule('0 0 * * *', async () => {
    try {
        // 백엔드 서버로 POST 요청 보내기
        const resResponse = await axios.post(
            "https://port-0-sonagi-app-project-1drvf2lloka4swg.sel5.cloudtype.app/boot/food/deleteAll"
        );
    } catch (error) {
        console.error('Error:', error.message);
    }
});




const sendExpoPushNotificationMember = async (tokens) => {
    for (const expotoken of tokens) {
        const notification = {
            to: expotoken,
            title: '음식 등록 알림',
            body: '5km 이내 식당에서 음식이 등록되었습니다!',
            sound: 'default',
            data: { withSome: 'data' },
        };
        try {
            const response = await axios.post('https://exp.host/--/api/v2/push/send', notification);
            if (response.status === 200) {
                console.log(`Successfully sent message to member with token: ${expotoken}`);
            } else {
                console.error(`Failed to send message to member with token: ${expotoken}`);
            }
        } catch (error) {
            console.error(`Error sending message to member with token: ${expotoken}, error: ${error.message}`);
        }
    }
};





const sendExpoPushNotificationRes = async (expoToken, adName, serving, foodName) => {

    const notification = {
        to: expoToken,
        title: '기부 요청 알림',
        body: `${adName} 에서 ${foodName}을 ${serving}인분 기부 요청을 하였습니다.`,
        sound: 'default',
        data: { withSome: 'data' },
    };
    try {
        const response = await axios.post('https://exp.host/--/api/v2/push/send', notification);
        if (response.status === 200) {
            console.log(`Successfully sent message to member with token: ${expoToken}`);
        } else {
            console.error(`Failed to send message to member with token: ${expoToken}`);
        }
    } catch (error) {
        console.error(`Error sending message to member with token: ${expoToken}, error: ${error.message}`);
    }
};


// Haversine 공식을 이용한 거리 계산 함수
function getDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});