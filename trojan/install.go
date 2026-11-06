package trojan

import (
	"fmt"
	"net"
	"runtime"
	"strconv"
	"strings"
	"time"
	"trojan/asset"
	"trojan/core"
	"trojan/util"
)

var (
	// dockerInstallCmd docker官方一键安装命令
	dockerInstallCmd = "curl -fsSL https://get.docker.com | bash -s docker"
	// dockerInstallUrl docker备用安装脚本
	dockerInstallUrl = "https://docker-install.netlify.app/install.sh"
	dbDockerRun      = "docker run --name trojan-mariadb --restart=always -p %d:3306 -v /home/mariadb:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=%s -e MYSQL_ROOT_HOST=%% -e MYSQL_DATABASE=trojan -d mariadb:10.2"
)

// InstallMenu 安装目录
func InstallMenu() {
	util.PrintTitle("安装管理")
	menu := []string{"更新trojan", "证书申请", "安装数据库(docker一键自建)"}
	switch util.LoopInput("请选择: ", menu, true) {
	case 1:
		InstallTrojan("")
	case 2:
		InstallTls()
	case 3:
		InstallMysql()
	default:
		return
	}
}

// InstallDocker 一条命令安装docker
func InstallDocker() {
	if util.CheckCommandExists("docker") {
		return
	}
	fmt.Println(util.Cyan("🐳 检测到未安装docker, 正在一键安装..."))
	if err := util.ExecCommand(dockerInstallCmd); err != nil || !util.CheckCommandExists("docker") {
		fmt.Println(util.Yellow("官方源安装失败, 尝试备用安装源..."))
		util.RunWebShell(dockerInstallUrl)
	}
	// 启动docker并设置开机自启
	util.ExecCommand("systemctl enable --now docker")
	if util.CheckCommandExists("docker") {
		fmt.Println(util.Green("✔ docker安装成功!"))
	} else {
		fmt.Println(util.Red("✘ docker安装失败!"))
	}
	fmt.Println()
}

// InstallTrojan 安装trojan
func InstallTrojan(version string) {
	fmt.Println()
	data := string(asset.GetAsset("trojan-install.sh"))
	checkTrojan := util.ExecCommandWithResult("systemctl list-unit-files|grep trojan.service")
	if (checkTrojan == "" && runtime.GOARCH != "amd64") || Type() == "trojan-go" {
		data = strings.ReplaceAll(data, "TYPE=0", "TYPE=1")
	}
	if version != "" {
		data = strings.ReplaceAll(data, "INSTALL_VERSION=\"\"", "INSTALL_VERSION=\""+version+"\"")
	}
	util.ExecCommand(data)
	util.OpenPort(443)
	util.SystemctlRestart("trojan")
	util.SystemctlEnable("trojan")
}

// InstallTls 安装证书
func InstallTls() {
	domain := ""
	server := "letsencrypt"
	fmt.Println()
	choice := util.LoopInput("请选择使用证书方式: ", []string{"Let's Encrypt 证书", "ZeroSSL 证书", "BuyPass 证书", "自定义证书路径"}, true)
	if choice < 0 {
		return
	} else if choice == 4 {
		crtFile := util.Input("请输入证书的cert文件路径: ", "")
		keyFile := util.Input("请输入证书的key文件路径: ", "")
		if !util.IsExists(crtFile) || !util.IsExists(keyFile) {
			fmt.Println("输入的cert或者key文件不存在!")
		} else {
			domain = util.Input("请输入此证书对应的域名: ", "")
			if domain == "" {
				fmt.Println("输入域名为空!")
				return
			}
			core.WriteTls(crtFile, keyFile, domain)
		}
	} else {
		if choice == 2 {
			server = "zerossl"
		} else if choice == 3 {
			server = "buypass"
		}
		localIP := util.GetLocalIP()
		fmt.Printf("本机ip: %s\n", localIP)
		for {
			domain = util.Input("请输入申请证书的域名: ", "")
			ipList, err := net.LookupIP(domain)
			fmt.Printf("%s 解析到的ip: %v\n", domain, ipList)
			if err != nil {
				fmt.Println(err)
				fmt.Println("域名有误,请重新输入")
				continue
			}
			checkIp := false
			for _, ip := range ipList {
				if localIP == ip.String() {
					checkIp = true
				}
			}
			if checkIp {
				break
			} else {
				fmt.Println("输入的域名和本机ip不一致, 请重新输入!")
			}
		}
		util.InstallPack("socat")
		if !util.IsExists("/root/.acme.sh/acme.sh") {
			util.RunWebShell("https://get.acme.sh")
		}
		util.SystemctlStop("trojan-web")
		util.OpenPort(80)
		checkResult := util.ExecCommandWithResult("/root/.acme.sh/acme.sh -v|tr -cd '[0-9]'")
		acmeVersion, _ := strconv.Atoi(checkResult)
		if acmeVersion < 300 {
			util.ExecCommand("/root/.acme.sh/acme.sh --upgrade")
		}
		if server != "letsencrypt" {
			var email string
			for {
				email = util.Input(fmt.Sprintf("请输入申请%s域名所需的邮箱: ", server), "")
				if email == "" {
					fmt.Println("申请域名的邮箱地址为空!")
					return
				} else if util.VerifyEmailFormat(email) {
					break
				} else {
					fmt.Println("邮箱格式不正确, 请重新输入!")
				}
			}
			util.ExecCommand(fmt.Sprintf("bash /root/.acme.sh/acme.sh --server %s --register-account -m %s", server, email))
		}
		issueCommand := fmt.Sprintf("bash /root/.acme.sh/acme.sh --issue -d %s --debug --standalone --keylength ec-256 --force --server %s", domain, server)
		if server == "buypass" {
			issueCommand = issueCommand + " --days 170"
		}
		util.ExecCommand(issueCommand)
		crtFile := "/root/.acme.sh/" + domain + "_ecc" + "/fullchain.cer"
		keyFile := "/root/.acme.sh/" + domain + "_ecc" + "/" + domain + ".key"
		core.WriteTls(crtFile, keyFile, domain)
	}
	Restart()
	util.SystemctlRestart("trojan-web")
	fmt.Println()
}

// InstallMysql 安装数据库, 默认在服务器上使用docker一键自建mariadb
func InstallMysql() {
	var mysql core.Mysql
	fmt.Println()
	if util.IsExists("/.dockerenv") {
		// 容器内无法自建docker数据库, 使用自定义mysql连接
		fmt.Println(util.Yellow("检测到当前处于docker容器环境, 请手动输入mysql连接信息"))
		if !inputCustomMysql(&mysql) {
			return
		}
	} else {
		// 自动选择在服务器上使用docker自建数据库
		fmt.Println(util.Cyan("将自动在服务器上使用docker安装数据库(mariadb)..."))
		mysql = core.Mysql{ServerAddr: "127.0.0.1", ServerPort: util.RandomPort(), Password: util.RandString(8, util.LETTER+util.DIGITS), Username: "root", Database: "trojan"}
		InstallDocker()
		if !util.CheckCommandExists("docker") {
			fmt.Println(util.Red("docker不可用, 无法自动安装数据库!"))
			return
		}
		fmt.Println(fmt.Sprintf(dbDockerRun, mysql.ServerPort, mysql.Password))
		if util.CheckCommandExists("setenforce") {
			util.ExecCommand("setenforce 0")
		}
		util.OpenPort(mysql.ServerPort)
		util.ExecCommand(fmt.Sprintf(dbDockerRun, mysql.ServerPort, mysql.Password))
		db := mysql.GetDB()
		startTime := time.Now()
		for {
			fmt.Printf("%s mariadb启动中,请稍等...\n", time.Now().Format("2006-01-02 15:04:05"))
			err := db.Ping()
			if err == nil {
				db.Close()
				break
			} else if time.Since(startTime) > 2*time.Minute {
				fmt.Println(util.Red("mariadb启动超时, 请检查docker容器状态(docker logs trojan-mariadb)!"))
				return
			} else {
				time.Sleep(2 * time.Second)
			}
		}
		fmt.Println(util.Green("✔ mariadb启动成功!"))
	}
	mysql.CreateTable()
	core.WriteMysql(&mysql)
	if userList, _ := mysql.GetData(); len(userList) == 0 {
		AddUser()
	}
	Restart()
	fmt.Println()
}

// inputCustomMysql 交互式输入自定义mysql连接, 连接成功返回true
func inputCustomMysql(mysql *core.Mysql) bool {
	for {
		for {
			mysqlUrl := util.Input("请输入mysql连接地址(格式: host:port), 默认连接地址为127.0.0.1:3306, 使用直接回车, 否则输入自定义连接地址: ",
				"127.0.0.1:3306")
			urlInfo := strings.Split(mysqlUrl, ":")
			if len(urlInfo) != 2 {
				fmt.Printf("输入的%s不符合匹配格式(host:port)\n", mysqlUrl)
				continue
			}
			port, err := strconv.Atoi(urlInfo[1])
			if err != nil {
				fmt.Printf("%s不是数字\n", urlInfo[1])
				continue
			}
			mysql.ServerAddr, mysql.ServerPort = urlInfo[0], port
			break
		}
		mysql.Username = util.Input("请输入mysql的用户名(回车使用root): ", "root")
		mysql.Password = util.Input(fmt.Sprintf("请输入mysql %s用户的密码: ", mysql.Username), "")
		db := mysql.GetDB()
		if db != nil && db.Ping() == nil {
			mysql.Database = util.Input("请输入使用的数据库名(不存在可自动创建, 回车使用trojan): ", "trojan")
			db.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s;", mysql.Database))
			return true
		} else {
			fmt.Println(util.Red("连接mysql失败, 请重新输入"))
		}
	}
}
