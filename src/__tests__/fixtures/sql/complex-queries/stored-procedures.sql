-- 复杂查询：存储过程测试用例
-- 问题描述：复杂存储过程逻辑，包括条件处理、循环、异常处理、事务管理等

-- 1. 基本存储过程
CREATE PROCEDURE sp_get_employee_details(IN emp_id INT)
BEGIN
    SELECT
        e.id,
        e.name,
        e.email,
        e.salary,
        d.name as department_name,
        p.name as position_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN positions p ON e.position_id = p.id
    WHERE e.id = emp_id;
END;

-- 2. 带条件逻辑的存储过程
CREATE PROCEDURE sp_process_order(
    IN order_id INT,
    IN new_status VARCHAR(20),
    OUT result_message VARCHAR(255)
)
BEGIN
    DECLARE current_status VARCHAR(20);
    DECLARE order_amount DECIMAL(10,2);

    -- 获取当前订单状态
    SELECT status, total_amount INTO current_status, order_amount
    FROM orders
    WHERE id = order_id;

    -- 检查订单是否存在
    IF current_status IS NULL THEN
        SET result_message = 'Order not found';
        RETURN;
    END IF;

    -- 检查状态转换是否合法
    IF current_status = 'completed' AND new_status != 'cancelled' THEN
        SET result_message = 'Cannot change status of completed order';
        RETURN;
    END IF;

    -- 更新订单状态
    UPDATE orders
    SET status = new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = order_id;

    SET result_message = CONCAT('Order status updated from ', current_status, ' to ', new_status);
END;

-- 3. 带循环的存储过程
CREATE PROCEDURE sp_generate_monthly_report(IN report_date DATE)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE dept_id INT;
    DECLARE dept_name VARCHAR(100);
    DECLARE total_sales DECIMAL(12,2);
    DECLARE order_count INT;

    -- 游标声明
    DECLARE dept_cursor CURSOR FOR
        SELECT id, name FROM departments;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- 创建临时表存储结果
    CREATE TEMPORARY TABLE monthly_report (
        department VARCHAR(100),
        total_sales DECIMAL(12,2),
        order_count INT,
        report_date DATE
    );

    -- 打开游标
    OPEN dept_cursor;

    -- 循环处理每个部门
    read_loop: LOOP
        FETCH dept_cursor INTO dept_id, dept_name;
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- 计算部门月度销售数据
        SELECT
            COALESCE(SUM(o.total_amount), 0),
            COUNT(o.id)
        INTO total_sales, order_count
        FROM orders o
        WHERE o.department_id = dept_id
        AND MONTH(o.order_date) = MONTH(report_date)
        AND YEAR(o.order_date) = YEAR(report_date);

        -- 插入临时表
        INSERT INTO monthly_report VALUES (
            dept_name, total_sales, order_count, report_date
        );

    END LOOP;

    -- 关闭游标
    CLOSE dept_cursor;

    -- 返回报告结果
    SELECT * FROM monthly_report ORDER BY total_sales DESC;

    -- 清理临时表
    DROP TEMPORARY TABLE monthly_report;
END;

-- 4. 带异常处理的存储过程
CREATE PROCEDURE sp_transfer_inventory(
    IN from_location_id INT,
    IN to_location_id INT,
    IN product_id INT,
    IN transfer_quantity INT,
    OUT success BOOLEAN,
    OUT message VARCHAR(255)
)
BEGIN
    -- 声明异常处理器
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET success = FALSE;
        SET message = CONCAT('Error occurred: ', SQLSTATE, ' - ', SQLERRM);
    END;

    DECLARE current_stock INT DEFAULT 0;
    DECLARE transfer_amount INT DEFAULT 0;

    -- 开始事务
    START TRANSACTION;

    -- 检查源位置库存
    SELECT COALESCE(SUM(quantity), 0) INTO current_stock
    FROM inventory
    WHERE location_id = from_location_id AND product_id = product_id;

    -- 检查库存是否充足
    IF current_stock < transfer_quantity THEN
        SET success = FALSE;
        SET message = CONCAT('Insufficient stock. Available: ', current_stock);
        ROLLBACK;
        RETURN;
    END IF;

    -- 从源位置减少库存
    UPDATE inventory
    SET quantity = quantity - transfer_quantity
    WHERE location_id = from_location_id AND product_id = product_id;

    -- 向目标位置增加库存
    INSERT INTO inventory (location_id, product_id, quantity)
    VALUES (to_location_id, product_id, transfer_quantity)
    ON DUPLICATE KEY UPDATE quantity = quantity + transfer_quantity;

    -- 记录库存转移日志
    INSERT INTO inventory_transfers (
        from_location_id, to_location_id, product_id,
        quantity, transfer_date, created_by
    ) VALUES (
        from_location_id, to_location_id, product_id,
        transfer_quantity, CURRENT_TIMESTAMP, CURRENT_USER()
    );

    -- 提交事务
    COMMIT;

    SET success = TRUE;
    SET message = 'Inventory transfer completed successfully';
END;

-- 5. 带动态SQL的存储过程
CREATE PROCEDURE sp_dynamic_search(
    IN table_name VARCHAR(50),
    IN search_column VARCHAR(50),
    IN search_value VARCHAR(100),
    IN limit_count INT DEFAULT 100
)
BEGIN
    DECLARE dynamic_sql TEXT;

    -- 构建动态SQL
    SET dynamic_sql = CONCAT(
        'SELECT * FROM ', table_name,
        ' WHERE ', search_column, ' LIKE ''%', search_value, '%''',
        ' LIMIT ', limit_count
    );

    -- 执行动态SQL
    SET @sql = dynamic_sql;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END;

-- 6. 带输出参数的复杂存储过程
CREATE PROCEDURE sp_calculate_customer_metrics(
    IN customer_id INT,
    OUT total_orders INT,
    OUT total_spent DECIMAL(12,2),
    OUT avg_order_value DECIMAL(12,2),
    OUT last_order_date DATE,
    OUT customer_tier VARCHAR(20)
)
BEGIN
    -- 计算客户指标
    SELECT
        COUNT(*),
        COALESCE(SUM(total_amount), 0),
        COALESCE(AVG(total_amount), 0),
        MAX(order_date)
    INTO total_orders, total_spent, avg_order_value, last_order_date
    FROM orders
    WHERE customer_id = customer_id;

    -- 确定客户等级
    IF total_spent >= 10000 THEN
        SET customer_tier = 'Platinum';
    ELSEIF total_spent >= 5000 THEN
        SET customer_tier = 'Gold';
    ELSEIF total_spent >= 1000 THEN
        SET customer_tier = 'Silver';
    ELSE
        SET customer_tier = 'Bronze';
    END IF;
END;

-- 7. 带递归逻辑的存储过程
CREATE PROCEDURE sp_delete_category_cascade(IN category_id INT, OUT deleted_count INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE sub_category_id INT;
    DECLARE sub_deleted INT DEFAULT 0;

    -- 游标获取子分类
    DECLARE category_cursor CURSOR FOR
        SELECT id FROM categories WHERE parent_id = category_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    SET deleted_count = 0;

    -- 递归删除子分类
    OPEN category_cursor;

    delete_loop: LOOP
        FETCH category_cursor INTO sub_category_id;
        IF done THEN
            LEAVE delete_loop;
        END IF;

        -- 递归调用删除子分类
        CALL sp_delete_category_cascade(sub_category_id, sub_deleted);
        SET deleted_count = deleted_count + sub_deleted;

    END LOOP;

    CLOSE category_cursor;

    -- 删除当前分类下的产品
    DELETE FROM products WHERE category_id = category_id;
    SET deleted_count = deleted_count + ROW_COUNT();

    -- 删除分类
    DELETE FROM categories WHERE id = category_id;
    SET deleted_count = deleted_count + 1;

END;

-- 8. 带批量处理的存储过程
CREATE PROCEDURE sp_bulk_update_prices(
    IN price_update_percent DECIMAL(5,2),
    IN category_filter INT DEFAULT NULL,
    OUT updated_count INT
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE product_id INT;
    DECLARE current_price DECIMAL(10,2);
    DECLARE new_price DECIMAL(10,2);

    -- 声明游标
    DECLARE product_cursor CURSOR FOR
        SELECT id, price
        FROM products
        WHERE (category_filter IS NULL OR category_id = category_filter);

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    SET updated_count = 0;

    -- 开始批量处理
    START TRANSACTION;

    OPEN product_cursor;

    update_loop: LOOP
        FETCH product_cursor INTO product_id, current_price;
        IF done THEN
            LEAVE update_loop;
        END IF;

        -- 计算新价格
        SET new_price = current_price * (1 + price_update_percent / 100);

        -- 更新产品价格
        UPDATE products
        SET price = new_price,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = product_id;

        SET updated_count = updated_count + 1;

    END LOOP;

    CLOSE product_cursor;

    COMMIT;
END;

-- 9. 带性能监控的存储过程
CREATE PROCEDURE sp_performance_test(IN test_iterations INT)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE start_time TIMESTAMP;
    DECLARE end_time TIMESTAMP;

    -- 创建结果表
    CREATE TEMPORARY TABLE performance_results (
        iteration INT,
        execution_time_ms INT,
        records_processed INT
    );

    -- 性能测试循环
    WHILE i < test_iterations DO
        SET i = i + 1;
        SET start_time = CURRENT_TIMESTAMP(3);

        -- 执行测试查询
        SELECT COUNT(*) INTO @record_count
        FROM orders
        WHERE order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY);

        SET end_time = CURRENT_TIMESTAMP(3);

        -- 记录结果
        INSERT INTO performance_results VALUES (
            i,
            TIMESTAMPDIFF(MICROSECOND, start_time, end_time) / 1000,
            @record_count
        );

    END WHILE;

    -- 返回性能统计
    SELECT
        AVG(execution_time_ms) as avg_time_ms,
        MIN(execution_time_ms) as min_time_ms,
        MAX(execution_time_ms) as max_time_ms,
        AVG(records_processed) as avg_records
    FROM performance_results;

    -- 清理临时表
    DROP TEMPORARY TABLE performance_results;
END;