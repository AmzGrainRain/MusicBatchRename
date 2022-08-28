const { extname }  = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const mm = require('music-metadata')

class Main {
  argv = require('minimist')(process.argv.slice(2))
  startTime = Date.now()

  constructor() {
    // 空参数调用打印使用方法
    if (Object.keys(this.argv).length === 1) {
      console.log(
        `参数说明: 
-i <path> 输入目录
-o <path> 输出目录
-r <regexp> 正则表达式, 删除匹配到的字符串
-t <string> [可选]替换正则匹配到的字符串
-m [可选]则根据音乐的元数据自动修正文件名
`
      )
      return
    }

    // 检查 输入|输出 目录参数
    if (!this.argv?.i?.length) {
      console.log('不完整的 -i 参数, 没有指定输入目录.')
      return
    }
    if (!this.argv?.o?.length) {
      console.log('不完整的 -o 参数, 没有指定输出目录.')
      return
    }
    // 检查正则表达式参数
    if (!this.argv?.m && this.argv.r === '') {
      console.log('不完整的 -m 参数, 没有输入一个正则表达式.')
      return
    }

    // 如果路径以 / 结尾则去掉结尾的 /
    if (this.argv.i.lastIndexOf('/') === this.argv.i.length - 1) {
      this.argv.i = this.argv.i.substring(0, this.argv.i.length - 1)
      ensureDirSync(this.argv.i)
    }
    if (this.argv.o.lastIndexOf('/') === this.argv.o.length - 1) {
      this.argv.o = this.argv.o.substring(0, this.argv.o.length - 1)
      ensureDirSync(this.argv.o)
    }

    // 安全性检查
    fs.stat(this.argv.i, (err, stat) => {
      if (err) throw Error('读取目录失败')
      if (stat.isDirectory()) this.forEachDir(this.argv.i)
      else throw Error('此路径非目录')
    })
  }

  forEachDir(pathString) {
    // 读取目录
    fs.readdir(pathString, (err, files) => {
      if (err) return console.log(err)

      // 遍历目录文件
      files.forEach((file) => {
        // 当前的路径
        const currentFilePath = `${pathString}/${file}`
        // 判断是文件还是目录
        fs.stat(currentFilePath, (err, stat) => {
          if (err) return console.log(err)

          // 是文件则调用 processFile 处理文件
          if (stat.isFile()) this.processFile(currentFilePath)
          // 是目录则执行递归操作
          else this.forEachDir(currentFilePath)
        })
      })
    })
  }

  processFile(filePath) {
    // 是否使用 ID3 修正文件名
    if (this.argv?.m) {
      // 读取文件 ID3 数据
      mm.parseFile(filePath).then((info) => {
        // 错误处理
        if (!info) throw new Error('读取文件 ID3 数据时出现错误')

        // 新文件
        const newFilePath = `${this.argv.o}/${info.common.artist} - ${
          info.common.title
        }${extname(filePath)}`

        // 判断是否使用异步方法操作
        if (typeof this.argv.a) fse.copyFile(filePath, newFilePath)
        else fse.copyFileSync(filePath, newFilePath)

        // 打印操作信息
        console.log(`旧文件: "${filePath}"`)
        console.log(`新文件: "${newFilePath}"\n`)
      })
    } else {
      // 新文件名
      const newFilePath = `${this.argv.o}/${filePath.replace(
        eval(this.argv.r),
        this.argv?.t ? this.argv.t : ''
      )}`

      // 判断是否使用异步方法操作
      if (typeof this.argv.a) fse.copyFile(filePath, newFilePath)
      else fse.copyFileSync(filePath, newFilePath)

      // 打印操作信息
      console.log(`旧文件: "${filePath}"`)
      console.log(`新文件: "${newFilePath}"\n`)
    }
  }
}

new Main()
