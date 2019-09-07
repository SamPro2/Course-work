'use strict';
var express = require('express');
var router = express.Router();
var sql = require('mssql/msnodesqlv8');
var multiparty = require('multiparty');

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index');
});

router.post('/search', async function (req, res) {
    var form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        if (!err) {
             var date1 = fields.date1[0];
             var date2 = fields.date2[0];
            
            var allcars = await get_complectation(date1, date2);
             
            res.render('search', {                            
                variables: allcars,

                        date1: date1,
                        date2: date2                    
            });
        } else {
            res.redirect('/');
        }
    });
});

router.get('/search2', async function (req, res) {
                                                                    
    var date1 = req.query.date1;                                  
    var date2 = req.query.date2
    ////var date1 = '2019-02-04'
    //var date2 = '2019-05-09'

    var allcars = await get_complectation(date1, date2);

    res.render('search', {
        variables: allcars,
        date1: date1,
        date2: date2
    });
})

router.get('/stock', async function (req, res) {

  

    var allcars2 = await get_table();

    res.render('stock', {
        allcars2: allcars2,
        length2: allcars2.length,
    });
})

async function get_complectation(date1, date2) {
    var sql_text = `declare @x date, @y date
set @x = @date1
set @y= @date2
select distinct dk.Description as Description, dk.EquimentId as Equipment, dk.Type as Type from
(select M.ModelId as model from 
Автомобили A left join Заказ Z on A.CarId=Z.CarId join Модели M on M.ModelId=a.modelid left join
Статус_заказа S on S.OrderId=z.OrderId 
left join Сервис SS on SS.CarId=a.CarId 
where A.CarId not in 
(Select CarId from Заказ z left join Статус_заказа S on S.OrderId=z.OrderId 
 WHERE(@x<=EndDateTime and @y>=StartDateTime and approved=1 and cancel=0) or 
(approved=1 and cancel=0 and returned=0) or (@x<=EndDate and @y>=StartDate))
group by M.ModelId) as model left join Комплектация k on k.ModelId=model.model
join Детали_комплектации dk
on k.EquimentId = dk.EquimentId`;

    var connection = new sql.ConnectionPool({
        database: 'KDZ',
        server: 'localhost\\SQLEXPRESS',
        driver: 'msnodesqlv8',
        options: { trustedConnection:true }        
    });

    await connection.connect();

    var q_req = new sql.Request(connection);
    var arr_tasks = await q_req
        .input("date1", sql.Date, date1)
        .input("date2", sql.Date, date2)
        .query(sql_text);

    return arr_tasks.recordset;
}

async function get_table(date1, date2) {
    var sql_text = `declare @x date, @y date
                    set @x=GETDATE()
                    set @y=GETDATE()
                    (select distinct a.CarId as CarId, p.Manufacturer, ModelName from 
                    Автомобили A left join Заказ Z on A.CarId=Z.CarId join Модели M on M.ModelId=a.modelid
                    join Производители P on m.ModelId=p.ModelId
                    left join Статус_заказа S on S.OrderId=z.OrderId 
                    left join Сервис SS on SS.CarId=a.CarId 
                    where A.CarId not in 
                    (Select CarId from Заказ z left join Статус_заказа S on S.OrderId=z.OrderId 
                    WHERE(@x<=EndDateTime and @y>=StartDateTime and approved=1 and cancel=0) or
                    (approved=1 and cancel=0 and returned=0) or (@x<=EndDate and @y>=StartDate)))`;

    var connection = new sql.ConnectionPool({
        database: 'KDZ',
        server: 'localhost\\SQLEXPRESS',
        driver: 'msnodesqlv8',
        options: { trustedConnection: true }
    });

    await connection.connect();

    var q_req = new sql.Request(connection);
    var arr_tasks = await q_req
        .input("date1", sql.Date, date1)
        .input("date2", sql.Date, date2)
        .query(sql_text);

    return arr_tasks.recordset;
}
router.post('/find', async function (req, res) {
    var form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        if (!err) {
            var date1 = fields.date1[0];
            var date2 = fields.date2[0];
            var transmission = fields.transmission[0];
            var conditioner = fields.conditioner[0];
            var clas = fields.clas[0];
            var body = fields.body[0];
            var seat = fields.seat[0];

            var carlist = await get_cars(transmission, body, conditioner, seat, clas, date1, date2);

            res.render('carlist', {
                carlist: carlist,
                date1: date1,
                date2: date2
            });
        } else {
            res.redirect('/');
        }
    });
})

async function get_cars(transmission, body, conditioner, seat, clas, date1, date2) {
    var sql_text = `declare @x date, @y date
    set @x = @date1
    set @y= @date2
    declare @a as int
    declare @b as int
    declare @c as int
    declare @d as int
    declare @e as int
    
    set @a = (select top 1 EquimentId from Детали_комплектации where Description='Тип коробки' and Type = @коробка)
    set @b = (select top 1 EquimentId from Детали_комплектации where Description='Тип кузова' and Type = @кузов)
    set @c = (select top 1 EquimentId from Детали_комплектации where Description='Кондиционер' and Type = @кондиционер)
    set @d = (select top 1 EquimentId from Детали_комплектации where Description='Количество мест' and Type = @места)
    set @e = (select top 1 EquimentId from Детали_комплектации where Description='Класс автомобиля' and Type = @класс)

    select pivo.ModelName as Name, Manufacturer as Manufacturer, Cost as Cost from
    (
    select ModelName, Manufacturer, [Тип коробки], [Тип кузова], [Кондиционер], [Количество мест], [Класс автомобиля], Cost
    from
    (select m.ModelName, p.Manufacturer, d.Description, d.EquimentId, Cost
						from (select M.ModelId as model, p.Manufacturer, m.CostPerDay*DateDiff(day, @x,@y) as Cost from 
						Автомобили A left join Заказ Z on A.CarId=Z.CarId join Модели M on M.ModelId=a.modelid
                        join Производители p on m.ModelId=p.ModelId
                        left join Статус_заказа S on S.OrderId=z.OrderId 
                        left join Сервис SS on SS.CarId=a.CarId 
                        where A.CarId not in 
                        (Select CarId from Заказ z left join Статус_заказа S on S.OrderId=z.OrderId 
                        WHERE(@x<=EndDateTime and @y>=StartDateTime and approved=1 and cancel=0) 
                        or (approved=1 and cancel=0 and returned=0) or (@x<=EndDate and @y>=StartDate))
						group by M.ModelId, p.Manufacturer, m.CostPerDay) as model 
						left join Модели m on m.ModelId = model.model
						join Автомобили A on a.ModelId=m.ModelId
						join Производители P on m.ModelId=p.ModelId
						join Комплектация k on k.ModelId = m.ModelId
					    join Детали_комплектации d on d.EquimentId = k.EquimentId) bas
    pivot
    (
	    max(EquimentId)
	    for Description in ([Тип коробки], [Тип кузова], [Кондиционер], [Количество мест], [Класс автомобиля])
    ) piv) as pivo
    where [Тип коробки]=@a and [Тип кузова]=@b and [Кондиционер]=@c and [Количество мест]=@d and [Класс автомобиля]=@e`;

    var connection = new sql.ConnectionPool({
        database: 'KDZ',
        server: 'localhost\\SQLEXPRESS',
        driver: 'msnodesqlv8',
        options: { trustedConnection: true }

    });

    await connection.connect();

    var q_req = new sql.Request(connection);
    var arr_tasks = await q_req
        .input("коробка", sql.NVarChar(100), transmission)
        .input("кузов", sql.NVarChar(100), body)
        .input("кондиционер", sql.NVarChar(100), conditioner)
        .input("места", sql.NVarChar(100), seat)
        .input("класс", sql.NVarChar(100), clas)
        .input("date1", sql.Date, date1)
        .input("date2", sql.Date, date2)
        .query(sql_text);

    return arr_tasks.recordset;
}

router.post('/udata', async function (req, res) {
    var form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        if (!err) {
            var date1 = fields.date1[0];
            var date2 = fields.date2[0];
            var car_name = fields.car_name[0];
            var client_name = fields.client_name[0];
            var client_lastname = fields.client_lastname[0];
            var client_phone = fields.client_phone[0];
            //var manufacturer = 'A';
            //var cost = 0;
                                   
            var order = await get_data(client_name, client_lastname, client_phone, car_name, date1, date2);
            var order2 = await get_manufacturer(car_name, date1, date2)

            res.render('udata', {
                client_name: client_name,
                car_name: car_name,
                date1: date1,
                date2: date2,
                order2: order2
            });
        } else {
            res.redirect('/');
        }
    });
})

async function get_data(client_name, client_lastname, client_phone, car_name, date1, date2) {
    var sql_text = `declare @name nvarchar(150), @lastname nvarchar(20), @number bigint , @modelname nvarchar(20),
                    @x date, @y date
                    set @name=@cname 
                    set @lastname=@clastname
                    set @number=@cnumber
                    set @modelname=@cmodelname
                    set @x=@cdate1
                    set @y=@cdate2


                    EXEC dbo.AddNewClient @name, @lastname, @number, @modelname, @x, @y`;
    var connection = new sql.ConnectionPool({
        database: 'KDZ',
        server: 'localhost\\SQLEXPRESS',
        driver: 'msnodesqlv8',
        options: { trustedConnection: true }
    });

    await connection.connect();

    var q_req = new sql.Request(connection);
    var arr_tasks = await q_req
        .input("cname", sql.NVarChar(150), client_name)
        .input("clastname", sql.NVarChar(20), client_lastname)
        .input("cnumber", sql.BigInt, client_phone)
        .input("cmodelname", sql.NVarChar(20), car_name)
        .input("cdate1", sql.Date, date1)
        .input("cdate2", sql.Date, date2)
        .query(sql_text);

    return arr_tasks.recordset;
}

async function get_manufacturer(car_name, date1, date2) {
    var sql_text = `declare @modelname nvarchar(20), @x date, @y date, @manufacturer nvarchar(20), @cost int

                    set @modelname=@cmodelname
                    set @x=@cdate1
                    set @y=@cdate2

                    (select p.Manufacturer as Manufacturer,  min(CostPerDay*DATEDIFF(day, @x, @y)) as Cost from 
		            Автомобили A left join Заказ Z on A.CarId=Z.CarId join Модели M on M.ModelId=a.modelid  join 
                    Производители P on m.ModelId=p.ModelId
		            left join Статус_заказа S on S.OrderId=z.OrderId 
                    left join Сервис SS on SS.CarId=a.CarId 
                    where (m.ModelName=@modelname and A.CarId not in (Select CarId from Заказ z 
                    left join Статус_заказа S on S.OrderId=z.OrderId 
                    WHERE(@x<=EndDateTime and @y>=StartDateTime and approved=1 and cancel=0) 
                    or (approved=1 and cancel=0 and returned=0) or (@x<=EndDate and @y>=StartDate)))
		            group by (p.Manufacturer))`;
    var connection = new sql.ConnectionPool({
        database: 'KDZ',
        server: 'localhost\\SQLEXPRESS',
        driver: 'msnodesqlv8',
        options: { trustedConnection: true }
    });

    await connection.connect();

    var q_req = new sql.Request(connection);
    var arr_tasks = await q_req
        .input("cmodelname", sql.NVarChar(20), car_name)
        .input("cdate1", sql.Date, date1)
        .input("cdate2", sql.Date, date2)
        .query(sql_text);

    return arr_tasks.recordset;
}
module.exports = router;
